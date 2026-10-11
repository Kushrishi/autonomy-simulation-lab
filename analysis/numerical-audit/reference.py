"""Independent NumPy/Joseph and SciPy references; invokes actual TS source.
Run from repo root: python analysis/numerical-audit/reference.py
No simulated deterministic noise is treated as Gaussian observations.
"""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import numpy as np
import scipy
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BASE = 'b20f6764e236d5207d8b82088fbcbdda24203dbb'

def execute(tests, root=ROOT):
    return json.loads(subprocess.run(['node', str(HERE / 'run-source.cjs')],
        cwd=ROOT, input=json.dumps(tests), text=True, capture_output=True, check=True,
        env={**os.environ, 'ASL_SOURCE_ROOT': str(root)}).stdout)

def kalman_reference(case):
    x = np.array(case['initial']['stateVector'], dtype=float)
    p = np.array(case['initial']['covariance'], dtype=float)
    dt, q, r = (case['config'][key] for key in ('timeStep','processNoise','measurementNoise'))
    f = np.eye(4); f[0,2] = f[1,3] = dt
    h = np.eye(2,4); eye = np.eye(4); out = []
    for observation in case['observations']:
        xp = f @ x; pp = f @ p @ f.T + q * eye
        s = h @ pp @ h.T + r * np.eye(2)
        if np.linalg.matrix_rank(s, tol=0) < 2:
            x, p = xp, pp
        else:
            gain = np.linalg.solve(s, h @ pp).T
            x = xp + gain @ (np.array([observation['row'],observation['col']]) - h @ xp)
            a = eye - gain @ h
            p = a @ pp @ a.T + r * gain @ gain.T
        out.append({'stateVector':x.tolist(), 'covariance':p.tolist()})
    return out

def kcase(name, p, q=.025, r=.18, dt=1, n=12):
    return {'name':name, 'kind':'kalman', 'initial':{'stateVector':[1.,-2.,.3,-.2], 'covariance':np.asarray(p).tolist()},
        'config':{'timeStep':dt,'processNoise':q,'measurementNoise':r},
        'observations':[{'row':1+.3*i+.2*np.sin(i), 'col':-2-.2*i+.3*np.cos(i)} for i in range(1,n+1)]}

def errors(actual, expected):
    x = max(np.max(np.abs(np.array(a['stateVector'])-np.array(e['stateVector']))) for a,e in zip(actual,expected))
    p = max(np.max(np.abs(np.array(a['covariance'])-np.array(e['covariance']))) for a,e in zip(actual,expected))
    symmetry = max(np.max(np.abs(np.array(a['covariance'])-np.array(a['covariance']).T)) for a in actual)
    mineig = min(np.linalg.eigvalsh(np.array(a['covariance'])).min() for a in actual)
    return {'max_state_abs':float(x),'max_covariance_abs':float(p),'max_asymmetry':float(symmetry),'min_covariance_eigenvalue':float(mineig)}

rng = np.random.default_rng(20261011)
a = rng.normal(size=(4,4)); correlated = a @ a.T
cases = [kcase('default',np.diag([1,1,2,2])), kcase('correlated_half_step',correlated,dt=.5),
    kcase('small_valid_covariance',np.eye(4)*1e-8,q=0,r=1e-8),
    kcase('large_prior_small_measurement',np.diag([1e20,1e20,1,1]),q=0,r=1),
    kcase('singular_zero_information',np.zeros((4,4)),q=0,r=0),
    kcase('long_sequence',correlated,dt=.2,n=5000)]
refs = [kalman_reference(c) for c in cases]
new = execute(cases)
with tempfile.TemporaryDirectory() as td:
    oldroot = Path(td)
    for name in ('kalmanFilter.ts','localization.ts'):
        dest = oldroot / 'src/localization' / name; dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(subprocess.check_output(['git','show',f'{BASE}:src/localization/{name}'],cwd=ROOT,text=True))
    old = execute(cases,oldroot)
    kresults = [{'name':c['name'],'steps':len(c['observations']), 'before':errors(b,e),'after':errors(n,e)} for c,b,n,e in zip(cases,old,new,refs)]
    # Range oracle: independent trust-region solver with numerical Jacobian.
    beacons = np.array([[0,0],[0,9],[9,0],[9,9]],float)
    rcases=[]; rrefs=[]; jac_errors=[]
    for i in range(40):
        truth = np.array([0.,0.]) if i==0 else rng.uniform(.2,8.8,2)
        measured = np.linalg.norm(truth-beacons,axis=1) + (rng.normal(0,.1,4) if i>=20 else 0)
        measured=np.maximum(0,measured)
        initial=truth+np.array([.5,-.4])
        obs=[{'beaconId':str(j),'beaconPosition':{'row':float(b[0]),'col':float(b[1])},'measuredRange':float(r)} for j,(b,r) in enumerate(zip(beacons,measured))]
        fun=lambda x: np.linalg.norm(x-beacons,axis=1)-measured
        ref=least_squares(fun,initial,jac='3-point',xtol=1e-13,ftol=1e-13,gtol=1e-13,max_nfev=1000)
        rcases.append({'name':f'range_{i}','kind':'ranges','initial':{'row':float(initial[0]),'col':float(initial[1])},'iterations':8,'observations':obs})
        rrefs.append({'position':ref.x.tolist(),'squared_residual_objective':float(fun(ref.x) @ fun(ref.x))})
        # Derivative of predicted range: same sign as measured-minus-predicted RHS.
        analytic=(initial-beacons)/np.linalg.norm(initial-beacons,axis=1)[:,None]
        eps=1e-5; numerical=np.column_stack([(fun(initial+np.eye(2)[j]*eps)-fun(initial-np.eye(2)[j]*eps))/(2*eps) for j in range(2)])
        jac_errors.append(float(np.max(np.abs(analytic-numerical))))
    positions=execute(rcases)
    differences=[float(np.linalg.norm(np.array([p['row'],p['col']])-r['position'])) for p,r in zip(positions,rrefs)]
    objective_diffs=[]
    for c,p,ref in zip(rcases,positions,rrefs):
        residual=np.array([np.hypot(p['row']-o['beaconPosition']['row'],p['col']-o['beaconPosition']['col'])-o['measuredRange'] for o in c['observations']])
        objective_diffs.append(float(abs(residual@residual-ref['squared_residual_objective'])))
    sample_case={'kind':'samples','path':[{'row':0,'col':0}], 'noise':0,'rows':10,'cols':10}
    sample_old=execute([sample_case],oldroot)[0][0]; sample_new=execute([sample_case])[0][0]
    # Initial sensitivity counterexample at the corner, eight original iterations.
    bad=rcases[0].copy(); bad['observations']=[{**o,'measuredRange':max(.05,o['measuredRange'])} for o in bad['observations']]
    corner_old=execute([bad],oldroot)[0]; corner_new=positions[0]

# Gaussian consistency experiment matched to Q=qI, R=rI and the prior, separate
# from simulator sin/cos noise. 400 independent trajectories, 40 updates each.
mc_cases=[]; mc_truth=[]
p0=np.diag([1.,1.,2.,2.]); f=np.eye(4); f[0,2]=f[1,3]=1
for _ in range(400):
    truth=rng.multivariate_normal(np.zeros(4),p0); zs=[]; truths=[]
    for _ in range(40):
        truth=f@truth+rng.normal(0,np.sqrt(.025),4)
        z=truth[:2]+rng.normal(0,np.sqrt(.18),2)
        zs.append({'row':float(z[0]),'col':float(z[1])}); truths.append(truth.copy())
    mc_cases.append({'kind':'kalman','initial':{'stateVector':[0,0,0,0],'covariance':p0.tolist()},'config':{'timeStep':1,'processNoise':.025,'measurementNoise':.18},'observations':zs});mc_truth.append(truths)
mc=execute(mc_cases); nees=[]; nis=[]; mc_parity=0.
for case, outputs, truths in zip(mc_cases,mc,mc_truth):
    expected=kalman_reference(case); mc_parity=max(mc_parity,errors(outputs,expected)['max_state_abs'])
    prev_x=np.zeros(4);prev_p=p0.copy()
    for z,out,truth in zip(case['observations'],outputs,truths):
        x=np.array(out['stateVector']);p=np.array(out['covariance']);err=x-truth
        nees.append(float(err@np.linalg.solve(p,err)))
        pp=f@prev_p@f.T+.025*np.eye(4);innovation=np.array([z['row'],z['col']])-(f@prev_x)[:2]
        nis.append(float(innovation@np.linalg.solve(pp[:2,:2]+.18*np.eye(2),innovation)))
        prev_x,prev_p=x,p
report={'baseline_commit':BASE,'numpy':np.__version__,'scipy':scipy.__version__,'kalman':kresults,
    'range_reference':{'cases':40,'iterations':8,'max_position_difference':max(differences),'max_squared_objective_difference':max(objective_diffs),'max_jacobian_finite_difference_error':max(jac_errors)},
    'zero_noise_corner':{'before_measured_range':sample_old['rangeObservations'][0]['measuredRange'],'after_measured_range':sample_new['rangeObservations'][0]['measuredRange'],'before_max_residual':max(abs(o['residual']) for o in sample_old['rangeObservations']),'after_max_residual':max(abs(o['residual']) for o in sample_new['rangeObservations']),'before_off_corner_initial_estimate':corner_old,'after_off_corner_initial_estimate':corner_new},
    'matching_gaussian_model':{'seed':20261011,'trajectories':400,'updates_per_trajectory':40,'mean_NEES':float(np.mean(nees)),'expected_NEES':4,'mean_NIS':float(np.mean(nis)),'expected_NIS':2,'max_TS_numpy_state_difference':mc_parity,'scope':'diagnostic only; not calibration evidence for deterministic browser noise'}}
(HERE/'results.json').write_text(json.dumps(report,indent=2)+'\n')
# Short frozen fixtures enter normal JS CI; full references reproducible separately.
fixtures={'kalman':[{'case':c,'expected':r} for c,r in zip(cases[:5],refs[:5])],
    'ranges':[{'case':c,'expected':r} for c,r in zip(rcases,rrefs)]}
(HERE/'fixtures.json').write_text(json.dumps(fixtures,indent=2)+'\n')
print(json.dumps(report,indent=2))
assert max(r['after']['max_state_abs'] for r in kresults)<1e-10
assert max(r['after']['max_covariance_abs'] for r in kresults)<1e-10
assert min(r['after']['min_covariance_eigenvalue'] for r in kresults)>=-1e-12
assert max(differences)<2e-6
assert max(objective_diffs)<1e-10

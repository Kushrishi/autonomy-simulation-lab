# Browser numerical audit and v1.0.1 corrections

Baseline: `b20f6764e236d5207d8b82088fbcbdda24203dbb` (browser v1.0.0).
Original release and observations remain unchanged. This audit covers the checks
below; it does not certify the entire application.

## Reproduce

```bash
npm ci
npm test
python -m pip install numpy==2.3.5 scipy==1.17.0
python analysis/numerical-audit/reference.py
npm run lint
npm run build
```

The Python reference invokes actual TypeScript through `run-source.cjs`. It uses
NumPy matrix equations and a linear solve, independently of the production
matrix helpers, and SciPy trust-region least squares with numerical Jacobians.
`fixtures.json` preserves short reference trajectories for normal JS CI.
`results.json` contains before/after and longer-sequence evidence. To reproduce
the baseline, its Git object must be available (fetch it if using a shallow
checkout of a later revision).

## Demonstrated defects and changes

* Kalman covariance: for P=diag(1e20,1e20,1,1), dt=1, Q=0, R=I, the old
  simplified covariance update gives zero position variances at the first
  update. Joseph form retains variance 1. The old absolute innovation-determinant
  cutoff also skips valid updates for P=1e-8 I, R=1e-8 I, Q=0. Scale-normalized
  inversion removes that cutoff. Symmetrization removes floating-point skew.
* Zero-noise ranges: at beacon (0,0) on a 10x10 grid, v1.0.0 generated range .05
  and residual .05 instead of zero. Ranges now saturate at zero, preserving exact
  zero-noise geometry. Residuals use exact geometric distance; only the Jacobian
  row at a zero-distance beacon is set to zero, because the norm has no unique
  derivative there. Other beacons supply directional information.
* Planners: all three could depart a blocked start (2x2 grid, start (0,0)
  blocked, goal (0,1)) and claim success/cost 1. Invalid or blocked endpoints now
  return unsuccessful results, including start=goal.
* Telemetry: replanning exports the displayed obstacle/start snapshot and the
  observed sample prefix. CSV now includes range and Kalman estimates/errors,
  retaining existing columns. UI identifies grid units, known-truth diagnostics,
  segment resets and cumulative planning time.

## Independent numerical results

Six filter trajectories check all four state entries and all 16 covariance
entries, including correlated priors, dt=.5, small covariance, large prior,
zero-information singular fallback and a 5,000-update sequence. Maximum corrected
state difference is 2.8422e-14; covariance difference 6.6614e-16. Checked
covariances are symmetric and PSD to the numerical tolerance. Ordinary default
updates were already consistent before the correction; challenging cases expose
actual defects rather than a wrong basic Kalman equation.

Forty range cases (20 noiseless, 20 inconsistent) use the same observations and
initial estimates for ASL and SciPy. Eight ASL iterations match positions within
1.8287e-8 grid cells and squared residual objectives within 5.4124e-16. Analytical
range Jacobians match central finite differences within 1.3395e-10 away from
beacons. These are bounded local comparisons, not a global convergence guarantee.

A seeded, separate Gaussian experiment uses 400 independent trajectories with
40 updates, the specified Q=qI and R=rI, and matching prior distribution. Mean
NEES=3.99884 (expected 4), mean NIS=2.00204 (expected 2); TS/NumPy maximum state
difference 1.4211e-14. This consistency diagnostic says nothing about calibration
under the browser's deterministic sine/cosine noise or sharp grid-path turns.

The independent Bellman-Ford planner oracle checks 11,520 unweighted 3x3 cases
and 7,680 weighted 2x3 cases. BFS minimizes steps; Dijkstra and A* match optimal
cost. Manhattan is admissible/consistent because movement is four-neighbor and
all allowed destination costs are at least one. Separate coordinate-derived
metric tests verify prefix Euclidean radial mean/current/max errors and RMSE.

## Model and remaining boundaries

State is [row,col,row velocity,col velocity]; dt is simulation-step duration.
Prediction is F x and F P F^T + Q. H observes position; R=rI; innovation is
z-Hx; K=P H^T (H P H^T+R)^-1. Noise configuration values are variances, not
standard deviations. Q=qI describes independent discrete position/velocity
increments, not continuous white acceleration. Equal diagonal values in different
state units are an educational convention, not sensor-derived physics. The
first measured position initializes the filter; its prior covariance is assigned,
not estimated from the deterministic sensor generator. Valid symmetric PSD prior
covariance is a caller assumption; finite/shape checks do not establish PSD.
Singular/nonpositive innovation covariance retains the predicted state.

Range LS is unweighted Gauss–Newton using J^T J delta=J^T(measured-predicted).
It has a finite iteration cap, no damping/robust loss/covariance estimate and no
convergence-status return. Degenerate geometry may return the current estimate;
poor initialization or inconsistent observations can fail to reach the optimum.
Zero-distance norm is nondifferentiable. The tests establish behavior on their
stated fixtures, not universal robustness. Browser errors require simulated
truth and cannot be observed directly by a deployed estimator.

References: [SciPy least_squares](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html)
and [NASA navigation filter best practices](https://ntrs.nasa.gov/api/citations/20180003657/downloads/20180003657.pdf).

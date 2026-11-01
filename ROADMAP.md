# Project status

The browser simulator and native replay tool are separate deliverables. Both are in maintenance; no new workload or feature expansion is planned.

## Completed work

| Deliverable | Evidence | Scope |
| --- | --- | --- |
| Browser simulator v1.0.2 | Planning, localization, tests and telemetry export | Educational simulation, not a GNSS receiver or vehicle autonomy system. |
| Native recording comparison | [Installed validation](native/INSTALLED_RECORDING_VALIDATION_2026_10_10.md) covers all 108 original frames and both preprocessing configurations | Same-workload engineering evidence, not perception accuracy or independent reproduction. |
| Crop-aware preprocessing | [Case study](native/CONTROLLED_REPLAY_CASE_STUDY.md) records three matched pairs with exact output parity | Approximately 8.97% median whole-process time reduction on one host, model and workload. |
| Recording recovery and viewer inspection | Accepted recordings recovered and inspected on the maintainer's Mac at six selected frames each | Bounded maintainer testing, not independent first use or close/reopen acceptance. |

## Outstanding limitations

The native tool has no published release. Its [release-readiness record](native/RELEASE_READINESS_2026_10.md) documents the remaining work:

- Historical output residue is detected, but its original cause is unresolved.
- The complete accepted viewer packet and the incomplete newer provenance packet must not be treated as the same artifact.
- Independent first use and close/reopen persistence have not been established.
- A fresh-machine installation and supported dependency matrix remain release requirements.

The browser's [numerical audit](analysis/numerical-audit/README.md) and documented accessibility/browser limitations remain relevant. No redesign is needed to preserve the existing example.

## Maintenance policy

Fix demonstrated defects and compatibility problems. Consider a new feature only when an actual user task requires it. Keep benchmarks specific to the measured configuration and distinguish input changes, output differences and timing results.

A future native release should let a new user install the documented toolchain, run the included synthetic example, compare an authorized recording and reopen its results. Passing the current tests is not a substitute for that first-use check.

Use existing tools where appropriate: Rerun supplies the viewer, and the model and inference runtime are third-party components. Do not describe their capabilities as original ASL contributions.

## Records and data

Preserve the original measurements and failed attempts. The detailed [October 11 status](https://github.com/Kushrishi/autonomy-simulation-lab/blob/61539437fc3723758e24782a851a7bd8748d8907/ROADMAP.md) remains available in repository history; this summary changes presentation, not results.

Raw KITTI data, private recordings and model downloads remain outside this repository. The MIT source licence does not replace dataset or model terms.

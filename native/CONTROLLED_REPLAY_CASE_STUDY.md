# Controlled replay: preprocessing changes versus exact-parity optimization

An engineer changing preprocessing needs to know whether identical recorded
inputs produce different outputs and whether processing costs change. The
retained 108-frame KITTI recording demonstrates two distinct investigations.

| Investigation | Independently recomputed result | Supported conclusion |
| --- | --- | --- |
| Center-crop contract versus direct-resize contract | 108 changed score vectors, 108 changed top-five lists, 107 changed top-one indices; maximum absolute score difference 9.68886637 | Direct resize is not numerically equivalent. Accuracy was not evaluated. Inspect frames 95, 93, 94. |
| Original versus crop-aware implementation of the same contract | Three matched pairs of 108 frames, exact scores, top-five indices and identities | The optimization preserved outputs on this workload. |

Matched whole-process wall pairs (baseline/candidate seconds):
4.141380/3.593176, 3.959165/3.628908, 3.980222/3.623002. Pair reductions:
13.2372%, 8.3416%, 8.9749%; median **8.9748698%**. Order was baseline/candidate,
candidate/baseline, baseline/candidate. These are one-host observations, not a
confidence interval or a universal throughput guarantee. Startup/cache/scheduling
were not fully controlled. Retained partial-output residue remains disclosed.

Summed preprocessing-stage counters over each 108-frame run (baseline/candidate
milliseconds): 700.467408/288.367646, 670.883524/291.443624,
680.066077/288.866484. Paired reductions are 58.8321%, 56.5582%, 57.5238%;
median **57.5237622%**. These stage counters exclude other work and startup;
they do not replace the whole-process wall-time result above.

The authentic [whole-process figure](../docs/assets/native_asl_matched_wall_time.png)
was reused without regeneration (SHA-256
`fd397cfbb8feea8dfc7997299106d8f370df5783f1876b72bfed4b56478045f2`).
Its [source data](../docs/assets/performance_data.json) were checked against the
retained summary; the [original rendering script](../docs/assets/make_performance_figure.py)
renders data only and executes no inference. The source packet is
`ASL_Center_Crop_Real_Probe_20261010.zip`, SHA-256
`05de26f6e43b53015d15fcf5e5cb198dfd6b120f12595c1546c54f6473fb967a`;
summary SHA-256
`e6d2735313be3e91a42bd09f07d025372d2094c42de96419411d9922d42c072f`.
The measured environment was Linux x86_64, GCC 13.3 Release, MobileNetV2,
ONNX Runtime 1.30.0 CPU, one inference thread with graph optimization disabled.

The original C++ optimization avoids resize rows/columns discarded by the
center crop while retaining filtering coefficients, rounding and accumulation
order. MobileNetV2 supplies the model, ONNX Runtime executes it, libpng decodes
images, KITTI supplies data/OXTS and Rerun supplies the viewer. ASL supplies input
contracts, preprocessing, native integration, recorded comparisons and adapters.

An independently implemented ordinary NumPy script given the same retained
records reproduces the differences and latency quantiles. ASL does not establish
better accuracy, review speed or user preference than a capable script plus
Rerun. Its engineering value is reusable contracts, checked C++ numerical work
and the measured exact-parity optimization. Keep it a bounded case study and
utility; more sensors/models/dashboards require an actual engineering need.

See [the installed workflow](INSTALLED_RECORDING_WORKFLOW.md),
[retained installed evidence](INSTALLED_RECORDING_VALIDATION_2026_10_10.md), and
[release readiness](RELEASE_READINESS_2026_10.md). Dataset and original output
payloads remain privately retained; obtain KITTI under its own terms rather than
redistributing it. The independently recomputed owner review is a separate
restricted-evidence review, not an open-data reproducibility claim.

For desktop acceptance, open baseline/candidate configuration identities in
Rerun, inspect frames 95/93/94, confirm camera/numerical channels align, and
close/reopen. Earlier owner inspection is maintainer feedback. Headless readback
is not interactive acceptance or independent-user evidence.

Use the older complete `ASL_Real_Viewer_Comparison_20261011.zip` packet
(SHA-256 `05189903903d8efc49b637e7e7ae99deaf793de1cfcba70ef73c18e98e336324`).
The newer `ASL_Real_Viewer_Provenance_20261011.zip` is incomplete and must not be
presented as its replacement. This bounded case study is in maintenance; desktop
inspection remains an explicit limit, not a reason to add features or rerun inference.

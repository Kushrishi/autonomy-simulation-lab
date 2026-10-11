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

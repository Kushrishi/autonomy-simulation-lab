# Native release readiness

Current acceptance status — 9 October 2026. The browser v1.0.0 release is separate.
No native release has been published.

| Requirement | Current evidence |
| --- | --- |
| Real recording and executed faults | All 108 authorized KITTI frames replayed; actual RGB/BGR and preprocessing-contract faults executed. See [real-sequence validation](REAL_SEQUENCE_VALIDATION_2026_10.md). |
| Linux/macOS inference installation | CPU inference and relocated installation passed native CI; ONNX Runtime bundling is implemented. |
| Repeatable comparison | Installed tools execute two preprocessing configurations and retain output, failures and comparison. |
| Rendered visualization | Representative frames inspected and all timeline positions checked through the SDK. See [graphical inspection](GRAPHICAL_QA_2026_10_09.md). |
| Human usability | Pending ordinary desktop navigation and independent first use. |
| Complete release workflow | Finish the installed recording-to-comparison-to-inspection walkthrough; validate supported installation and first use before native release. |

Older entries below are dated evidence, not the current blocker list. Same-host
repeatability does not establish cross-host equivalence or perception accuracy.

## Historical audit — 6 October 2026


Status: end-to-end engineering boundary implemented and CI-green. **No public
native version tag/release has been created. Publication requires user approval.**
Browser v1.0.0 remains unchanged.

| Required boundary | Evidence / limitation |
| --- | --- |
| Recorded input identity | Existing manifest/path/timestamp/SHA contracts; tiny project-generated recording committed. |
| Consumed-byte identity | Bounded manifest/model/frame snapshots are hashed and consumed directly; path changes after read do not change the decoded/loaded bytes. Single-file ONNX only. |
| Bounded decode | libpng RGB8 tests; corrupt and oversized inputs rejected by existing tests. |
| Preprocessing | Original seven-pattern Python/C++ parity; independent Pillow 12.3.0 eight-pattern model contract. <=1e-6 max error. |
| Inference | Pinned ORT 1.30.0 CPU; tiny generated fixture in CI; optional pinned MobileNet real workload locally replayed twice. |
| Output | Finite float32 JSONL with model/input/recording/config identity and round-trip values; partial failures preserved; no clobber of existing output. |
| Comparison | Exact identities, missing/extra/order/timestamps, per-frame numerical/structural differences, fixed tolerances and latency distributions. Python CLI remains separate from native runner. |
| Determinism policy | Exact repeated outputs observed on tested Linux host; general atol=rtol=1e-6 declared before real comparison; no cross-host bitwise claim. |
| Tests | Eleven native CTests locally ASan/UBSan, including SDK-independent viewer snapshot validation; LeakSanitizer unavailable in Work VM. Linux CI enables ASan/UBSan and inference; macOS CI tests foundation/preprocessing/spatial metadata without ORT. |
| CI | PR11 native and browser CI passed; run 37417923250 includes successful build/test on Linux and macOS. |
| Documentation/example | INFERENCE.md, two contracts, generated model provenance and synthetic manifest/PNG, optional spatial/viewer adapters. |

The synthetic engineering boundary is met. The current release gate additionally
requires real-sequence and real visualization validation; it is **not yet met**. Limitations that remain explicit:

- real KITTI synchronized replay is not validated; official acquisition requires
  an authorized account;
- Rerun 0.38.1 export was generated/reopened locally, not a full interactive
  viewer QA or required CI dependency;
- MobileNet repeated inference used synthetic constant-color images, not an
  accuracy or driving-perception evaluation;
- model accuracy, calibration, sensor fusion and cross-platform inference
  equivalence are not claimed;
- native model-reference parity covers fixed fixtures, not an exhaustive proof
  for all image sizes/filter implementations;
- existing raw-model/caller preprocessing compatibility remains an explicit
  caller responsibility.

Recommended decision: acquire authorized real data and validate synchronized
replay and visualization before requesting release approval. Do not label it a complete physical-AI
stack or a sensor-fusion release. A real KITTI example is the next earned
engineering validation milestone after lawful acquisition.

Fresh-source reproduction on the same Linux host passes ten Release CTests,
installs the runner and executes the included exact-repeat/fault example. A new
Python venv uses Pillow 12.3.0; pinned ORT/libpng dependencies are shared from
the recorded local prefixes. This is not a clean-OS or independent reproduction.
The fault/benchmark tooling is bounded and synthetic; spatial-state faults do
not imply a downstream image-inference effect. Calibration rejects non-rigid
rotation matrices; analytical WGS84/ENU axis and antimeridian tests pass.

## 7 October evidence update

[Authorized real-sequence validation](REAL_SEQUENCE_VALIDATION_2026_10.md) now
covers all 108 synced frames, repeated MobileNet, controlled faults, spatial
conversion and complete RRD export/reopen. The preceding 6 October statements
about absent real replay describe the earlier boundary. Interactive viewer QA,
durable protected-data handoff and independent installation remain open; no
release/tag is approved.

## 7 October fresh-source release-candidate audit

The [fresh-source reproduction](CLEANROOM_REPRODUCTION_2026_10.md) passes the documented installed synthetic example, faults, structured report, benchmark and Rerun export/reopen. A fresh authorized import and all-108-frame MobileNet run compare exactly with the retained baseline. Shared native dependency prefixes and the same Linux host limit the independence claim. The protected-data-complete private handoff exists. Human graphical QA remains OPEN; no release/tag, rename or additional workload is approved.

## 9 October objective graphical evidence

[Actual Rerun rendered views](GRAPHICAL_QA_2026_10_09.md) were inspected at frame
0, 53 and 107 with camera, ENU position history, skew, model-output and latency
channels visible. All 108 viewer cursor positions passed SDK readback checks.
This improves the prior export/reopen boundary. Human interactive usability
remains OPEN; the private screenshots and RRD are not public artifacts. No
release/tag or broader determinism claim follows from this inspection.

## Installed workflow integration — 9 October 2026

Recording import and Rerun export tools are now installed alongside comparison.
Actual configuration comparison retains `comparison.json`, directly accepted by
the viewer with result-identity validation. The relocated-install test exercises
two native runs and candidate-to-viewer preparation without source imports or
Rerun installed. See [the complete walkthrough](INSTALLED_RECORDING_WORKFLOW.md).
This closes a packaging/integration gap; it does not claim a new real-sequence
execution or human desktop acceptance.

# Native release-candidate audit — 2026-10-06

Status: end-to-end engineering boundary implemented and CI-green. **No public
native version tag/release has been created. Publication requires user approval.**
Browser v1.0.0 remains unchanged.

| Required boundary | Evidence / limitation |
| --- | --- |
| Recorded input identity | Existing manifest/path/timestamp/SHA contracts; tiny project-generated recording committed. |
| Bounded decode | libpng RGB8 tests; corrupt and oversized inputs rejected by existing tests. |
| Preprocessing | Original seven-pattern Python/C++ parity; independent Pillow 12.3.0 eight-pattern model contract. <=1e-6 max error. |
| Inference | Pinned ORT 1.30.0 CPU; tiny generated fixture in CI; optional pinned MobileNet real workload locally replayed twice. |
| Output | Finite float32 JSONL with model/input/recording/config identity and round-trip values; partial failures preserved; no clobber of existing output. |
| Comparison | Exact identities, missing/extra/order/timestamps, per-frame numerical/structural differences, fixed tolerances and latency distributions. Python CLI remains separate from native runner. |
| Determinism policy | Exact repeated outputs observed on tested Linux host; general atol=rtol=1e-6 declared before real comparison; no cross-host bitwise claim. |
| Tests | Eight native CTests locally ASan/UBSan; LeakSanitizer unavailable in Work VM. Linux CI enables ASan/UBSan and inference; macOS CI tests foundation/preprocessing/spatial metadata without ORT. |
| CI | PR11 native and browser CI passed; run 37417923250 includes successful build/test on Linux and macOS. |
| Documentation/example | INFERENCE.md, two contracts, generated model provenance and synthetic manifest/PNG, optional spatial/viewer adapters. |

The end-to-end synthetic release gate is met. Limitations that remain explicit:

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

Recommended decision: review and approve a bounded native preview release once
the final evidence package is assessed. Do not label it a complete physical-AI
stack or a sensor-fusion release. A real KITTI example is the next earned
engineering validation milestone after lawful acquisition.

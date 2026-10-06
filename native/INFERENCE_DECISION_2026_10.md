# Native inference continuation decision

Date: 2026-10-06. Preprocessing is implemented; inference is not. Browser v1 is unchanged.

## Runtime comparison

| Runtime | License / C++ / reproducibility | Integration tradeoff |
| --- | --- | --- |
| [ONNX Runtime](https://onnxruntime.ai/docs/get-started/with-cpp.html) CPU | MIT; native C++ API over C API; explicit CPU execution provider and [thread settings](https://onnxruntime.ai/docs/performance/tune-performance/threading.html) | Recommended next runtime: minimal dependency boundary and portable ONNX artifact. Sequential execution and fixed threads reduce variation but do not certify cross-architecture bitwise output. Pin an exact release before implementation. |
| [OpenVINO](https://docs.openvino.ai/) | Apache-2.0; C++ CPU inference and model conversion | Useful alternative if CPU workload tuning is the goal; additional conversion/device configuration is unnecessary for the first replay-correctness question. |
| [LiteRT](https://ai.google.dev/edge/litert) | Apache-2.0 ecosystem with native integration; compact edge workload | Reasonable for edge deployment; different model format/delegate ecosystem increases conversion and parity surface here. Not selected for the first implementation. |

No runtime package/model was installed or executed in this milestone. Selection is a recommendation for implementation, not inference evidence.

## Reference workload

Prefer an fp32 MobileNetV2 ONNX classification workload from the [ONNX model zoo](https://github.com/onnx/models/blob/main/validated/vision/classification/mobilenet/README.md), whose model page declares Apache-2.0. It is a reference computation, not an ASL perception innovation or accurate autonomy model. Candidate output: 1×1000 scores; exact artifact/version/shape must be checked before execution.

Do NOT use a mutable `main` URL as identity. First obtain an immutable model-repository revision and actual bytes; record SHA-256, license, opset, input/output names/shapes, class metadata, runtime release/CPU provider and thread/optimization settings. No weights were downloaded, so no model digest is asserted yet.

The new direct half-pixel bilinear resize contract is a deliberate replay contract. Model-zoo preprocessing may instead prescribe aspect-preserving resize/center crop or other interpolation. Do not silently claim canonical model accuracy using this contract. Either select a compatible workload or version an independently tested model-specific contract. Parity must be re-established before inference if the contract changes.

## Output and comparison boundary (planned)

Planned JSONL records: schema version, frame ID/timestamp, recording manifest digest, input SHA, model SHA, preprocessing contract/config digest, runtime/provider/thread identity, output shape/dtype and full vector or referenced vector digest, stable top-k/tie rule, preprocessing/inference/total latency. Latency is not part of a deterministic prediction digest.

Comparison must reject incompatible recording/preprocessing schemas, report model changes explicitly (a candidate-model comparison is legitimate), list missing/extra/reordered/timestamp-mismatched frames, and report per-frame max/mean error and changed-frame thresholds alongside latency distributions. Tolerances must be fixed before observing a candidate, not tuned to make it pass. An output digest alone cannot support tolerance comparison without retained numerical outputs.

Determinism levels: exact identity/manifest hashes; tested byte-identical probe serialization on one platform for preprocessing; numerical tolerance for runtime predictions; explicit structural/top-k equivalence with ties. Cross-platform bitwise inference is NOT claimed.

## Infrastructure choices

- [openpilot process replay](https://github.com/commaai/openpilot/blob/master/openpilot/selfdrive/test/process_replay/README.md) supplies the known-good process-output comparison pattern. Reuse the principle, not openpilot's vehicle stack.
- [Rerun timelines](https://rerun.io/docs/concepts/logging-and-ingestion/timelines): prefer a Python adapter from replay results to camera/trajectory/latency channels; keep the native core viewer-independent. Not implemented.
- [MCAP specification](https://mcap.dev/spec): defer an adapter until end-to-end replay needs interoperable multimodal messages. Preserve TSV; do not replace a working format for fashion.
- [KITTI terms](https://www.cvlibs.net/datasets/kitti/): CC BY-NC-SA 3.0; official raw download requires account registration/purpose. Do not mirror or redistribute raw frames here. No sequence downloaded. Exact sequence/calibration/OXTS checksums and timestamp convention remain next after synthetic end-to-end integration. No sensor-fusion claim.
- [CARLA](https://carla.org/): simulator reference only; not a rebuild target.

## Release gate

NOT MET. The current new boundary is RGB8 → tested float32 NCHW preprocessing API. No production `run` inference, JSONL output, `compare`, real sequence, viewer or performance measurement exists yet. Next: complete full native CMake/CI with libpng headers, then pin a compatible workload/runtime and implement a tiny end-to-end recording. Do not create a v2 release from preprocessing alone.

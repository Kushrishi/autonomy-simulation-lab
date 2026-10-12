# Native release acceptance

Updated 10 October 2026. The browser v1.0.0 release is separate; no native release
has been published. [Roadmap](../ROADMAP.md) defines the execution order.

| Requirement | Evidence | Remaining work |
| --- | --- | --- |
| Frame, model and preprocessing identity | Bounded consumed-byte validation, pinned runtime/model contracts and independent preprocessing reference checks. | Preserve the supported formats and explicit limits. |
| Supported installation | Linux x86_64 and macOS arm64 CPU-inference CI; relocated install with original ONNX Runtime extraction unavailable. | Independent first use; system libpng/zlib and Python dependencies remain required. |
| Real recorded execution | All 108 frames replayed; actual RGB/BGR and preprocessing changes exercised. | No perception-accuracy claim follows; do not repeat the recording solely to restate completion. |
| Installed comparison | Two executions on exact recovered frames completed; new baseline outputs matched retained baseline. | Original candidate partial/lock residue remains unexplained. The post-exit guard detects residue; native successful execution now also checks lock release. Neither establishes the historical cause. |
| Visualization data | Owner-side Apple Silicon Mac graphical inspection passed in Rerun 0.38.1 for both exact accepted recordings at frames 0, 53, 107, 95, 93 and 94; twelve genuine screenshots retained privately. | Independent first use and close/reopen persistence remain unestablished; no accuracy or deployment validation. |
| Reproducible deliverable | Owner independently restored the accepted baseline/candidate comparison archive and verified both recording hashes before graphical inspection. Earlier packet recovery remains recorded in its dated evidence. | Preserve the accepted originals and private visual evidence; do not substitute earlier recordings. |
| Native release | Source and third-party notices are included in the installed layout. | Resolve the open items above, document limitations and obtain release approval before tagging. |

## Acceptance procedure

Use the [installed walkthrough](INSTALLED_RECORDING_WORKFLOW.md) and
[desktop checklist](USABILITY.md#desktop-acceptance-of-the-retained-recording).
Record the platform, versions, artifact identity and each actual failure. A
successful test suite or SDK timeline readback is not a human-usability result.
Preserve existing outputs when a step fails; do not erase residue or rerun the
model to make an earlier attempt appear clean.

## Evidence records

- [Real-sequence validation](REAL_SEQUENCE_VALIDATION_2026_10.md): exact inputs,
  repeated CPU inference and controlled faults.
- [Fresh-source reproduction](CLEANROOM_REPRODUCTION_2026_10.md): same-host scope
  and dependency limitations.
- [Rendered graphical inspection](GRAPHICAL_QA_2026_10_09.md): representative
  views and timeline checks, distinct from ordinary interactive navigation.
- [Installed real-recording validation](INSTALLED_RECORDING_VALIDATION_2026_10_10.md):
  two measured runs, exact baseline comparison and preserved cleanup exception.

These records describe their dated executions. Current acceptance is the table
above; older blockers do not become current simply because they remain in a
historical record. These checks do not establish driving-model accuracy,
suitability for vehicle deployment or cross-platform numerical equivalence.

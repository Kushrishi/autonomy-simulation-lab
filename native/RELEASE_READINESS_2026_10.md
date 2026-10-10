# Native release acceptance

Updated 10 October 2026. The browser v1.0.0 release is separate; no native release
has been published. [Roadmap](../ROADMAP.md) defines the execution order.

| Requirement | Evidence | Remaining work |
| --- | --- | --- |
| Frame, model and preprocessing identity | Bounded consumed-byte validation, pinned runtime/model contracts and independent preprocessing reference checks. | Preserve the supported formats and explicit limits. |
| Supported installation | Linux x86_64 and macOS arm64 CPU-inference CI; relocated install with original ONNX Runtime extraction unavailable. | Independent first use; system libpng/zlib and Python dependencies remain required. |
| Real recorded execution | All 108 frames replayed; actual RGB/BGR and preprocessing changes exercised. | No perception-accuracy claim follows; do not repeat the recording solely to restate completion. |
| Installed comparison | Two executions on exact recovered frames completed; new baseline outputs matched retained baseline. | Original candidate partial/lock residue remains unexplained. The post-exit guard detects residue; native successful execution now also checks lock release. Neither establishes the historical cause. |
| Visualization data | Candidate RRD and layout verified; six decoded channels each have 108 rows. Earlier representative rendered views inspected. | Ordinary desktop navigation, readability and close/reopen acceptance. |
| Reproducible deliverable | Compact comparison records retained; original recording bundle recovered with matching hashes. | Complete new viewer packet recovered from three retained parts; all part hashes, the original 95,071,053-byte archive hash and ZIP CRCs passed fresh readback. |
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

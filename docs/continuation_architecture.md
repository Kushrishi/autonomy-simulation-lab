# Autonomy engineering extension architecture

October 3, 2026. Preserve the completed TypeScript v1 simulator. Extend it with a bounded native replay application, without representing the educational localization model as a GNSS receiver or production autonomy stack.

## Maintain two honest boundaries

The browser lab supplies planning, simplified localization and inspectable telemetry. A native perception replay validator is an adjacent engineering extension: image frames are a different input contract from grid-cell localization samples. Do not fabricate camera observations from the simulator or claim that the two systems already form an integrated autonomy pipeline.

The retained Linux C++/ONNX Runtime feasibility probe is useful starting code, not a portable application release. Python/native inference agreement is not dataset accuracy, independent preprocessing validation, latency improvement or an Apple Silicon pass.

## Components

| Component | Contract | Responsibility |
| --- | --- | --- |
| Browser simulator | Scenario and versioned telemetry, grid cells / simulation steps | Educational planning and estimation; existing UI |
| Native input reader | Licensed recording manifest, stable frame IDs, timestamps, hashes | Validate ordering, identity, decode failures; bounded memory |
| Preprocessor | Explicit color, layout, shape, dtype and normalization | Independently test geometry and tensor construction |
| Inference backend | Pinned model and ONNX Runtime environment | Run two identified configurations; distinguish warmup |
| Comparison writer | Per-frame results and run lifecycle | Report differences, failures and completion; atomic final publication |
| Existing viewer adapter | Read-only validated result bundle | Inspect discrepant frames using one real Rerun or FiftyOne workflow |

Use C++17/CMake for native orchestration, ONNX Runtime for inference, Python for the independent baseline and analysis. Reuse operator profiling and an existing viewer. Never treat score differences as accuracy changes without ground truth.

## First repair and export contract

Telemetry schema v1 adds a scenario snapshot and explicit grid-cell / simulation-step units. Existing fields stay available. Snapshot data must not change when the live editor changes. CSV must double embedded quotation marks and preserve recorded sample steps. `scenarioSnapshot` records the state at export; it is not an initial-state plus obstacle-event history and does not guarantee full simulation replay. JSON retains range and Kalman samples; CSV remains a compact position-series export.

## Build gates

1. Portable minimal native build: pin model/dependencies and verify Linux and Apple Silicon separately. Sanitizers and negative input tests accompany the C++ reader. An unavailable platform stays pending.
2. One short openly licensed recording: establish redistribution rights, stable identities and timestamps before selecting model-dependent outcomes. Keep queues bounded, count processed/failed/skipped frames, and make cancellation/write failure leave a clearly incomplete run.
3. Independent baseline: identical task/model with a simple Python implementation; an independently checked preprocessing fixture; numeric tolerance comparisons across platforms. Byte hashes establish identity, not floating-point equivalence.
4. Useful inspection: complete one persisted viewer workflow, inspect actual discrepancies, and document the custom engineering still needed beyond that tool. Offline serialization alone is insufficient.
5. Measured release: latency distribution, throughput and peak memory with decoding/preprocessing included; warmup separated; fresh-checkout install, CI on claimed platforms, a short demonstration and limitations.

One useful end-to-end task is the release gate. Do not add GPU support, distributed execution, cloud fleet management or a simulator rewrite first. If an existing tool plus a short script handles the workflow adequately, integrate or contribute to it rather than build a duplicate platform.

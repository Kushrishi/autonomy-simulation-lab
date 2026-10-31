# Autonomy Simulation Lab

Tools for inspecting sensing and inference pipelines, with two separate workflows.

| Workflow | Purpose | Status |
| --- | --- | --- |
| Native C++/Python replay | Verify recordings, run CPU inference and compare processing configurations. | Engineering case study in maintenance; no native release. |
| Browser simulator | Explore grid planning, localization and telemetry using synthetic measurements. | [v1.0.2](https://github.com/Kushrishi/autonomy-simulation-lab/releases/tag/v1.0.2); maintenance. |

[Live simulator](https://kushrishi.github.io/autonomy-simulation-lab/) · [Native quickstart](native/USABILITY.md) · [Architecture](docs/architecture.md) · [MIT licence](LICENSE)

## Native replay

The runner validates timestamps and file identity, decodes bounded PNG inputs, applies an explicit preprocessing contract and runs a pinned ONNX Runtime CPU model. Python tools compare outputs, frame order, configuration identity and timing. Optional Rerun export adds imagery and spatial context.

A crop-aware C++ optimization avoids calculating resized pixels that the final center crop discards. Across three matched 108-frame pairs it reduced median whole-process wall time by **8.97%**, with exact recorded model-output parity. Median summed per-frame preprocessing time fell by **57.52%**; that is a separate measurement, not the overall speedup.

The measurements cover one Linux host, one MobileNetV2 model and one workload. Startup, cache and scheduling were not fully controlled. No general speed, accuracy or cross-platform numerical guarantee is claimed.

![Matched whole-process timing measurements](docs/assets/publication/native-asl-wall-time-publication.png)

[Full measurements and limitations](native/CONTROLLED_REPLAY_CASE_STUDY.md) · [Figure provenance](docs/assets/publication/README.md)

Start with the [included synthetic example](native/USABILITY.md), then use the [recording-to-viewer walkthrough](native/INSTALLED_RECORDING_WORKFLOW.md) for compatible data and models. Model, viewer and system dependencies are separate; this is not a universal binary.

ASL supplies preprocessing, validation and comparison code. ONNX Runtime, MobileNetV2, KITTI, libpng and Rerun supply their respective runtime, model, data, decoder and viewer.

### Remaining limitations

The [real-recording validation](native/INSTALLED_RECORDING_VALIDATION_2026_10_10.md) and [release-readiness record](native/RELEASE_READINESS_2026_10.md) retain the unresolved output-residue issue and incomplete provenance packet. Owner-side Mac viewer inspection was completed; independent first use and close/reopen persistence have not been established. The native tool does not implement sensor fusion or establish perception accuracy.

## Browser simulator

![Browser planning and localization simulator](docs/assets/simulator-cockpit.png)

Compare BFS, A* and Dijkstra, add obstacles and inspect replanning. BFS minimizes steps on an unweighted grid; A* and Dijkstra use terrain-weighted costs. Localization examples include range-based Gauss–Newton estimation and a constant-velocity Kalman filter using position observations. JSON/CSV telemetry supports separate Python analysis.

This is an educational simulator, not a GNSS receiver or autonomous-vehicle stack. Its deterministic noise and simplified process model do not establish calibrated uncertainty. Keyboard-only grid editing is unsupported, and comprehensive browser/accessibility acceptance remains incomplete. See the [numerical audit](analysis/numerical-audit/README.md) for checks and corrections.

From a checkout:

```bash
npm ci
npm test
npm run build
npm run dev
```

Open `http://localhost:5173/autonomy-simulation-lab/`. On Windows PowerShell, use `npm.cmd` if script-execution policy blocks `npm`.

## Further documentation

- [Native build and contracts](native/README.md)
- [Inference and preprocessing](native/INFERENCE.md)
- [Data acquisition](native/ACQUISITION.md) and [spatial adapters](native/SPATIAL_ADAPTERS.md)
- [Telemetry analysis](analysis/README.md)
- [Scope and maintenance plan](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)

Source code is MIT licensed. Dataset and model terms remain separate; private recordings are not distributed here.

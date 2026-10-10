# Autonomy Simulation Lab roadmap

Updated 10 October 2026. [Native acceptance](native/RELEASE_READINESS_2026_10.md)

## Deliverable

A recorded-data comparison tool for a sensing engineer: verify a recording,
execute two processing configurations, identify changed frames and inspect the
image, timing and spatial context together. The native C++/Python workflow is
the current development focus. The released browser simulator remains a separate
educational demonstration of planning and localization.

## Milestones and decisions

| Milestone | Status | Work and completion evidence | Decision afterward |
| --- | --- | --- | --- |
| Browser simulator | Released as v1.0.0 | Interactive planning/localization, tests and telemetry export. | Maintain correctness and compatibility; no browser redesign is needed for the native deliverable. |
| Installed real-recording comparison | Completed with limitations | All 108 original frames recovered with matching hashes; relocated native install executed both preprocessing configurations; comparison and viewer files verified. See [validation](native/INSTALLED_RECORDING_VALIDATION_2026_10_10.md). | Retain this as systems evidence, not perception accuracy or independent cross-host reproduction. |
| Reliable output and artifact recovery | Open | Diagnose the retained partial/lock residue and qualify full recording-packet recovery. The comparison now rejects observed residue after process exit. Preserve diagnostic files and final outputs. | Close only when the failure mechanism is understood or a documented supported workflow is verified; a detection guard alone is not the root-cause fix. |
| Desktop acceptance | Pending person and recoverable packet | Open the retained recording/layout, navigate beginning/middle/end, inspect camera/timing/skew/ENU panels and close/reopen. Record setup, readability and responsiveness failures. | Fix observed usability problems before claiming the native workflow is ready for release. SDK readback is not this check. |
| Native release candidate | Conditional | Document supported OS/dependencies, build from a fresh checkout, run the installed synthetic example and real-data instructions, retain evidence and notices, and complete independent first use. | Publish a narrowly scoped native release after acceptance and release approval; browser v1.0.0 does not imply native release readiness. |
| Next workload | Deferred | Select a new sensor, model or adapter only from a demonstrated user task and specify an evaluation against a simple existing workflow. | Extend the working replay tool, not an unbounded autonomous-driving platform. A paper requires a separate research contribution. |

## Immediate order

1. Preserve and investigate the existing output-cleanup evidence using isolated
   filesystem tests before considering another real-recording execution.
2. Recover the full viewer packet; compact comparison results alone are not a
   substitute for the recording needed for desktop inspection.
3. Complete the [desktop acceptance procedure](native/USABILITY.md#desktop-acceptance-of-the-retained-recording).
4. Resolve observed installation/usability problems, then assess native release readiness.

These are completion dependencies, not promised dates. The current blocker is
not lack of another perception experiment. Adding datasets or retraining models
would not establish the missing desktop acceptance.

## Relevant standards

Reviewed 10 October 2026:

- [evo](https://github.com/MichaelGrupp/evo) offers focused commands, explicit
  trajectory formats and saved evaluation results. Adopt its narrow workflow and
  metric clarity. ASL cannot claim trajectory error without an estimated trajectory
  and an appropriate independent reference.
- [Rerun](https://github.com/rerun-io/rerun) provides multimodal visualization and
  recorded-data inspection. Integrate its viewer rather than build a competing
  visualization platform. ASL's contribution is verified execution and comparison.

## Completion standard

A new user should be able to install the supported toolchain, run a supplied
synthetic example, compare an authorized recording, locate a changed frame and
reopen the result. The report must distinguish input/configuration changes,
numerical changes and latency measurements. Repeatability is stated for the
measured environment; image classification outputs alone do not validate driving
perception, geodetic accuracy or sensor fusion.

Raw KITTI data, derived private recordings and model downloads remain outside the
public repository. Keep the acquisition and attribution instructions with the
workflow. The MIT source license does not replace third-party data/model terms.

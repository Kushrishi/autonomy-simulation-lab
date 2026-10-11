# Autonomy Simulation Lab roadmap

Updated 11 October 2026. [Native acceptance](native/RELEASE_READINESS_2026_10.md)

## Deliverable

A recorded-data comparison tool for a sensing engineer: verify a recording,
execute two processing configurations, identify changed frames and inspect the
image, timing and spatial context together. The native C++/Python workflow is
a bounded engineering case study in maintenance. The released browser simulator remains a separate
educational demonstration of planning and localization.

## Milestones and decisions

| Milestone | Status | Work and completion evidence | Decision afterward |
| --- | --- | --- | --- |
| Browser simulator | Released as v1.0.2; maintenance only | Interactive planning/localization, tests and telemetry export. | Maintain correctness and compatibility; no browser redesign is needed for the native deliverable. |
| Installed real-recording comparison | Completed with limitations | All 108 original frames recovered with matching hashes; relocated native install executed both preprocessing configurations; comparison and viewer files verified. See [validation](native/INSTALLED_RECORDING_VALIDATION_2026_10_10.md). | Retain this as systems evidence, not perception accuracy or independent cross-host reproduction. |
| Reliable output and artifact recovery | Packet recovered; historical residue cause open | Complete viewer packet recovered with matching part/archive hashes and ZIP CRCs. The comparison rejects post-exit residue; successful native execution checks lock release. Preserve the original diagnostic files. | Investigate the historical cause only from new evidence or isolated filesystem checks. Detection and checked cleanup do not explain an earlier failure. |
| Owner graphical inspection | Completed within defined scope | Rerun 0.38.1 loaded both hash-verified accepted recordings on the owner’s Apple Silicon Mac. Twelve screenshots cover frames 0, 53, 107, 95, 93 and 94 on both recordings; Instructor review accepted the inspection. | Independent first use, close/reopen persistence and broader deployment/perception validation remain unestablished. |
| Native release candidate | Conditional | Document supported OS/dependencies, build from a fresh checkout, run the installed synthetic example and real-data instructions, retain evidence and notices, and complete independent first use. | Publish a narrowly scoped native release after acceptance and release approval; browser v1.0.2 does not imply native release readiness. |
| Next workload | Deferred | Select a new sensor, model or adapter only from a demonstrated user task and specify an evaluation against a simple existing workflow. | Extend the working replay tool, not an unbounded autonomous-driving platform. A paper requires a separate research contribution. |

## Maintenance decision

The browser is feature-complete for its existing educational scope. Native ASL
is a bounded C++ case study with a measured exact-parity preprocessing optimization;
no native release, new workload or feature campaign is authorized. Preserve the
numerical audit and all historical outcomes.

The owner restored the accepted comparison archive and completed bounded Mac
graphical inspection. The [desktop procedure](native/USABILITY.md#desktop-acceptance-of-the-retained-recording)
remains available for future authorized use; close/reopen persistence was not established
by the retained screenshots. Independent first use remains unmeasured. Investigate
historical residue only if new substantive evidence appears; do not equate current
checked cleanup with an explanation of the earlier failure.

Future release or compatibility work requires a demonstrated defect or an actual
supported-user need. The milestone table records conditional acceptance requirements,
not an active development campaign or permission to publish a native release.

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

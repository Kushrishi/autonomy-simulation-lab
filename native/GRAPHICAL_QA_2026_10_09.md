# Objective Rerun graphical inspection — 9 October 2026

Status: actual rendered views inspected; **interactive human usability remains
OPEN**. This is additional evidence from the retained authorized recording, not
a new inference run or a release approval.

The existing 108-frame KITTI RRD was hash-verified and loaded unchanged with
Rerun 0.38.1. A private inspection blueprint displayed camera imagery, the full
ENU position history, camera/OXTS skew, model top indices, inference latency and
total latency. The full-history trajectory is a viewer setting; it does not
introduce a camera-coordinate or sensor-fusion claim.

| Check | Observation / scope |
| --- | --- |
| Frame range | Viewer reported frame timeline 0–107; all 108 cursor positions were set and read back exactly through the viewer SDK. |
| Camera progression | Actual rendered screenshots at 0, 53 and 107 showed distinct beginning, middle and ending camera images with normal progression. This is representative inspection, not inspection of every decoded texture. |
| Spatial channel | The full ENU position history rendered as a finite, continuous-looking sequence. Numerical geodetic correctness remains established by the existing independent checks, not appearance. |
| Timing and inference | Skew, model top indices and both latency views were visible at the three selected cursor states. The model row and plotted cursor markers followed the selected frame. |
| Viewer warnings | The six selected views reported no warnings in the captured representative states. |
| Interactive usability | Not established: inspection used the headless viewer and SDK cursor controls, not human mouse/keyboard operation. |

## Reproduction and setup friction

The local Vulkan loader initially had no usable graphics adapter, and the
synthetic screenshot check failed. A hash-verified official Ubuntu Mesa Vulkan
driver package was extracted into a private user-scoped directory; no system
package installation or security setting change was needed. The software Vulkan
renderer then passed the synthetic check and rendered the real recording.

The inspection blueprint needed the active catalog dataset identity when sent
through the SDK. An earlier blueprint bound to the original application name
did not activate. Screenshot writes were also asynchronous: the final capture
procedure awaited each saved image and allowed camera decoding/rendering to
settle before advancing the cursor. Earlier captures are superseded.

The screenshots, RRD, blueprint and detailed viewer-state records remain private
because they contain KITTI-derived material. They are absent from Git and public
review artifacts. Only this text record is public.

## Remaining gate

An authorized user still needs to confirm ordinary interactive navigation and
practical usability. No release/tag, rename or additional workload is approved.
Same-host reproduction does not establish cross-machine determinism.

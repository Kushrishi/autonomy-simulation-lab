# Installed real-recording validation — 10 October 2026 UTC

The installed recording-to-comparison-to-viewer workflow passed on all 108 frames
of the previously authorized KITTI recording. This closes the real-input
installation check; human desktop acceptance remains pending.

Source: `1e2c273b8848028413cd6fe1a73b834ced181ee6`.
The prospective execution record is retained privately. Exactly two inference
invocations were permitted, each with a 300-second cap and no automatic retry.

## Input recovery and environment

The retained RRD contained the original encoded PNG bytes. Rerun 0.38.1's catalog
API recovered every frame; all 108 SHA-256 values matched the retained manifest.
No reencoding, new dataset acquisition or frame selection was performed.
The manifest hash is
`54fc829e1b3f49f1ae5673cc5360143943876f43cf7f008a10d7d9c188fa8063`.

The fresh Linux Release build passed all 11 tests. It used GCC 13.3.0,
Python 3.12.14, CMake 4.3.1, libpng 1.6.43, Pillow 12.3.0 and the documented
ONNX Runtime 1.30.0 CPU distribution. The host lacked libpng headers;
official 1.6.43 headers at commit
`ed217e3e601d8e462f7fd1e04bed43ac42212429` were paired with the existing
matching system library. This was a tested setup step, not a clean-OS install.

The installation was relocated before execution. The original ONNX Runtime
extraction directory was made unavailable, and commands ran from an unrelated
working directory using only installed tools. The pinned MobileNetV2 model
and its SHA-256 are specified in [INFERENCE.md](INFERENCE.md).

## Measured behavior

| Execution | Preprocessing | Whole-process wall time | Exit |
| --- | --- | ---: | ---: |
| Baseline | asl-imagenet-center-v1 | 4.175868 s | 0 |
| Candidate | asl-rgb-bilinear-v1 | 3.674150 s | 0 |

At the declared `atol=rtol=1e-6`, all 108 frames had numerical differences
and preprocessing-identity differences. There were no missing, extra or
reordered frames. This confirms that the workflow exposes the effects of the
two executed configurations; it does not establish an accuracy regression.

The fresh baseline also matched the retained baseline's numerical outputs at
zero tolerance on all 108 frames. This is a comparison of these two artifacts,
not a general cross-platform determinism guarantee. Process CPU time and peak
RSS were not measured by this comparison wrapper.

The installed exporter produced the candidate RRD from the exact manifest,
candidate records, comparison and spatial records. Rerun verification passed.
A decoded readback found 108 rows in each of six model, latency, changed-frame,
position and synchronization channels; every changed marker was 1. A separate
inspection blueprint also passed RRD verification.

## Remaining acceptance

The private packet retains predictions, comparison, recording, hashes and
viewer layout. A person still needs to open it, scrub frames 0, 53 and 107,
check panel readability and synchronization, and close/reopen the recording.
Headless verification is not evidence of interactive responsiveness or usability.
No native release, perception-accuracy claim or new scientific result follows
from this validation.

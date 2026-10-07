# Fresh-source reproduction and release audit — 7 October 2026

A fresh checkout at `183229f26e1a606f7cef23ab489c36e668e27d0f`, separate build/install
directories and a newly created Python venv reproduced the documented native path.
This is a same-host source/environment reproduction, not independent review,
a clean operating system or a cross-machine determinism demonstration.

Environment: Ubuntu 24.04.3 LTS, Linux x86_64, GCC 13.3.0, Python 3.12.14,
CMake 4.3.1, Pillow 12.3.0, Rerun SDK 0.38.1. The fresh Python environment resolved
NumPy 2.5.3 and PyArrow 25.0.1. Native libpng 1.6.43/zlib 1.3 and ORT 1.30.0
use the previously built immutable local dependency prefixes; they were not
independently rebuilt or downloaded again. The retained official ORT archive
SHA-256 matches the documented `a5ed5a3c…3b3fd` identity. No protected input enters CI.

## Commands and observed friction

Follow [USABILITY.md](USABILITY.md). The reproduction used:

```bash
python3 -m venv /local/asl-python
/local/asl-python/bin/pip install Pillow==12.3.0 rerun-sdk==0.38.1 cmake==4.3.1
/local/asl-python/bin/cmake -S native -B /local/asl-build -DCMAKE_BUILD_TYPE=Release \
  -DASL_ONNXRUNTIME_ROOT=/local/onnxruntime-linux-x64-1.30.0 \
  -DCMAKE_PREFIX_PATH=/local/libpng-prefix \
  -DPython3_EXECUTABLE=/local/asl-python/bin/python
/local/asl-python/bin/cmake --build /local/asl-build --parallel 4
/local/asl-python/bin/ctest --test-dir /local/asl-build --output-on-failure
/local/asl-python/bin/cmake --install /local/asl-build --prefix /local/asl-install
/local/asl-python/bin/python native/tools/example.py /local/asl-install/bin/asl-replay /local/example
/local/asl-python/bin/python native/tools/rerun_adapter.py native/examples/synthetic/manifest.tsv \
  /local/example/baseline.jsonl /local/synthetic.rrd
/local/asl-python/bin/rerun rrd verify /local/synthetic.rrd
```

CMake was absent from PATH in the resumed environment. Installing it in the fresh
venv resolved that prerequisite. This managed environment also removed executable
permission from the installed CTest binary between invocations; restoring the
owner execute bit allowed tests to run. These are recorded setup frictions, not
silently treated as completed tests. No project source fix was needed for either.

All eleven Release CTests passed. The installed binary displayed help and ran the
included recording twice with identical outputs/identities, excluding latency.
The documented numerical result fault changed `f0` and was correctly detected.
The included structured report was generated. Synthetic Rerun export and CLI
reopen verification passed with the fresh SDK. The bounded benchmark performed
three exact-repeat runs; its latency is host evidence, not an accuracy claim.

A separate fresh Debug build enabled ASan/UBSan; all eleven tests passed (7.99 s).
LeakSanitizer remains disabled because unavailable in this environment.

## Separate authorized-import reproduction

A fresh private copy of only the required local camera/OXTS/calibration streams
was imported with `--limit 108`, fixed before this reproduction. Complete frame
counts, identity, timestamps, rigid calibration and spatial metadata passed.
The newly installed binary executed all 108 MobileNet frames using the documented
`asl-imagenet-center-v1` contract. Comparison against the previously accepted
baseline showed **zero changed frames** at atol=rtol=0, excluding latency.

An initial invocation supplied an incorrectly remembered preprocessing contract;
it failed with `unknown preprocessing contract` before producing an accepted run.
The corrected invocation used a new output path and preserved the failed attempt.
This was an invocation error, not a README defect or a changed scientific result.

## Release-candidate assessment

| Boundary | Current evidence / remaining limit |
| --- | --- |
| CLI and errors | Native help, declared usage/runtime exit codes and comparison 0/1/2 paths are covered by included tests and the fresh example. Unsupported preprocessing fails explicitly. |
| Output identity/schema | Existing versioned JSONL, snapshot identity and schema rejection tests pass. No clobber and failure preservation remain intentional. |
| Synthetic reproduction/faults | Installed binary, exact repeat, structured report and documented fault pass from fresh source. |
| Native quality | Release and sanitizer tests; existing Linux/macOS CI uses generated/licensable fixtures. No KITTI CI dependency. |
| Real import/inference | All 108 frames, exact fresh-binary comparison; spatial-state faults do not feed vision inference. |
| Performance | Three-run native stage/throughput/RSS evidence in REAL_SEQUENCE_VALIDATION; startup/serialization boundaries explicit. |
| Visualization | Real 108-frame RRD exported/reopened; private user QA handoff prepared. **Human graphical QA is pending.** |
| Data/governance | Local official archives/derivatives only; attribution preserved. Private complete archive handoff exists. No public imagery/RRD redistribution. |
| Installation portability | Same Linux host and shared native dependency prefixes; no independent clean-OS or cross-host equivalence claim. |

No blocking source defect was found. Stale absent-real-data statements in the
adapter/usability entry points are corrected by this update. The release gate
still requires the human to inspect frame coverage, camera progression, finite
ENU trajectory, skew/output/latency channels and aligned usable timelines.
No release/tag, rename or additional perception subsystem is created.

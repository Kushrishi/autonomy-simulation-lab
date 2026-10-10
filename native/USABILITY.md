# Build, install, replay and diagnose

Prerequisites: C++17 compiler, CMake ≥3.20, Python 3, libpng development headers.
Check `cmake --version` before starting. In a Python environment without system
CMake, `python3 -m pip install cmake==4.3.1` is one tested option; ensure that
environment's `bin` directory is on PATH.
On Debian/Ubuntu use `libpng-dev`; on macOS use Homebrew `libpng`. If installed
in a user prefix, pass `-DCMAKE_PREFIX_PATH=/absolute/prefix`. The original
preprocessing tests use only Python's standard library. Inference tests additionally
require Pillow 12.3.0 and the pinned ONNX Runtime distribution below.

## Linux x64 CPU inference: complete fresh-checkout workflow

After cloning the repository, run from its root. Downloads are external to Git.
The commands below bundle ONNX Runtime, the synthetic example and its tools into
the installation. Move the entire installation directory; the original checkout
and runtime extraction folder are not needed to run the installed example.
System libpng, zlib, Python 3 and a compatible OS/C++ runtime remain required.
Native CI exercises pinned CPU inference on Linux
x86_64 and macOS arm64 with synthetic inputs. Each platform checks its own
repeat runs; this does not establish cross-platform numerical equivalence or
human desktop usability. The x64 Linux archive below is not a macOS dependency.

```bash
ASL_WORKDIR="$(mktemp -d)"
curl --fail --location --retry 3 -o "$ASL_WORKDIR/ort.tgz" https://github.com/microsoft/onnxruntime/releases/download/v1.30.0/onnxruntime-linux-x64-1.30.0.tgz
printf '%s  %s\n' a5ed5a3cac51fbb2e90da632ae43d19212faaa20e76484e62bcb7c23ddb3b3fd "$ASL_WORKDIR/ort.tgz" | sha256sum --check
tar -xzf "$ASL_WORKDIR/ort.tgz" -C "$ASL_WORKDIR"
python3 -m venv "$ASL_WORKDIR/python"
"$ASL_WORKDIR/python/bin/pip" install Pillow==12.3.0
cmake -S native -B "$ASL_WORKDIR/build" -DCMAKE_BUILD_TYPE=Release -DASL_ONNXRUNTIME_ROOT="$ASL_WORKDIR/onnxruntime-linux-x64-1.30.0" -DASL_BUNDLE_ONNXRUNTIME=ON -DPython3_EXECUTABLE="$ASL_WORKDIR/python/bin/python"
cmake --build "$ASL_WORKDIR/build" --parallel 4
ctest --test-dir "$ASL_WORKDIR/build" --output-on-failure
cmake --install "$ASL_WORKDIR/build" --prefix "$ASL_WORKDIR/install"
"$ASL_WORKDIR/install/bin/asl-replay" --help
"$ASL_WORKDIR/install/bin/asl-example" "$ASL_WORKDIR/example"
python3 "$ASL_WORKDIR/install/share/asl-replay/tools/compare.py" "$ASL_WORKDIR/example/baseline.jsonl" "$ASL_WORKDIR/example/candidate.jsonl" --atol 0 --rtol 0
python3 "$ASL_WORKDIR/install/share/asl-replay/tools/compare.py" "$ASL_WORKDIR/example/baseline.jsonl" "$ASL_WORKDIR/example/fault/results.jsonl" --atol 0 --rtol 0
```

The final comparison deliberately exits **1** and identifies `f0`: the first
numerical output was increased by 0.25. Both real replay runs should compare
exactly with exit **0**. The fault changes a result record, not a trained model.
`fault/fault.json` records the base hash, configuration and generated file hashes.
The example refuses an existing output directory. Preserve it for review.

The installed `asl-example` command exits **0** only after the exact
repeat matches, the deliberately edited result is detected, **and two actual
CPU inference runs with different preprocessing contracts produce an aligned,
numerically changed comparison**. This reuses the existing
`compare_configurations.py` workflow rather than a second demonstration
pipeline. Its output identifies the changed frames and paths to two saved
reports. You can reopen the evidence without running inference again:

```bash
python3 -m json.tool "$ASL_WORKDIR/example/report.json"
python3 -m json.tool "$ASL_WORKDIR/example/configurations/report.json"
```

The configuration report retains the source identities, both execution
records and the per-frame differences. The separate injected fault is a
record-only mutation; the preprocessing comparison executes the model.
The command exits **2** on setup or execution failure, including an existing
output directory. The installed model is a channel-mean arithmetic fixture,
not a perception model. These synthetic frames have no accuracy labels.
No network, private recording, external dataset or training job is required.

Named run options can appear in any order. Duplicate, unknown and missing
options produce explicit errors. Native input/runtime failure exits 1; unknown
command usage exits 2. Python comparison exits 0 for equivalence, 1 for detected
differences, 2 for malformed input. Unsupported result schema, boolean numerical
outputs, invalid shapes/top indices/timings and incomplete records fail visibly.

## Fault fixtures

```bash
python3 native/tools/faults.py manifest native/examples/synthetic/manifest.tsv "$ASL_WORKDIR/bad-hash" --kind wrong-hash
"$ASL_WORKDIR/install/bin/asl-replay" verify-files "$ASL_WORKDIR/bad-hash/manifest.tsv"
```

This should exit 1 with an integrity mismatch. The source recording is untouched.
Manifest faults: drop, duplicate, reorder, timestamp, wrong-hash, corrupt.
Result faults: drop, duplicate, reorder, timestamp, numeric, model-identity,
preprocessing-identity, shape. Spatial-record faults: ENU east bias in metres,
OXTS skew in nanoseconds, missing pose. `--index` selects a record; `--delta`
sets the declared magnitude. Every fixture starts from an identified base and
writes a new directory with bounded inputs. No private/raw dataset is committed.

Drop can leave a valid shorter recording; comparison must expose missing frames.
Timestamp changes can remain ordered; identity comparison must expose the change.
A wrong hash/corrupted byte must fail integrity before inference. Spatial bias
changes recorded state only; image inference does not consume ENU or OXTS.
Model/preprocessing identity edits are **record-level fault simulations**, not
claims of executing a different runtime/model or altered RGB preprocessing.
Existing independent tensor parity tests catch channel/layout/normalization bugs.

## Repeated performance and deterministic output

```bash
python3 native/tools/benchmark.py "$ASL_WORKDIR/install/bin/asl-replay" native/examples/synthetic/manifest.tsv native/tests/fixtures/channel_means.onnx --model-sha 436aa6e3a86b7d5d82af06c55060eb0ca3d8ca07cc60879d05fcd39e446130a0 --repeats 3
```

The bounded harness reports host, executable/model/recording identity, per-run
p50/p95 verification, decode, preprocessing, inference and total latency,
whole-command throughput, child high-water RSS and exact-repeat comparisons.
Per-frame total excludes startup and serialization; command wall time includes
those costs. Verification is the per-frame read/hash, not initial all-file
verification. Serialization is not separately instrumented. Latency never enters
the deterministic result comparison. This tiny synthetic workload is not a
real driving benchmark, accuracy test or universal performance claim.

## Real-data and release boundary

See [ACQUISITION.md](ACQUISITION.md) for user registration/download and
[SPATIAL_ADAPTERS.md](SPATIAL_ADAPTERS.md) for import and optional local Rerun export.
A fresh checkout/build/install reproduction has been exercised on the development
Linux host; it is not an independent external reproduction or clean operating
system certification. The complete [108-frame real sequence](REAL_SEQUENCE_VALIDATION_2026_10.md) has
passed import/replay/export/reopen. Human interactive viewer QA remains required
before the current native release gate is met. See the [fresh-source audit](CLEANROOM_REPRODUCTION_2026_10.md). No tag/release is created.

## Installed recording-to-viewer workflow

The [installed walkthrough](INSTALLED_RECORDING_WORKFLOW.md) connects local recording
import, two actual preprocessing executions, input-bound comparison and optional
Rerun inspection. All adapter tools are included in the installation; no source
checkout is needed. Rerun remains optional and is installed separately.

## Desktop acceptance of the retained recording

Use the existing authorized 108-frame RRD and its inspection blueprint with
Rerun 0.38.1. Keep the KITTI-derived recording, screenshots and paths private.
Do not rerun inference or acquire another recording for this check. If the RRD
or blueprint is unavailable on the inspection machine, recover the retained
package first; representative screenshots are not a substitute.

Record the viewer version, OS, recording hash and whether a blueprint was used.
Then perform these actions with ordinary mouse/keyboard input:

1. Open the recording and confirm the frame timeline covers 0–107.
2. Scrub and step through frames 0, 53 and 107. Confirm that camera imagery and
   the displayed model/timing state follow the selected frame without stale panels.
3. Pan/zoom the ENU view, return to the full trajectory, and confirm that the
   controls remain usable. Appearance does not verify geodetic accuracy.
4. Read the camera/OXTS skew and inference/total-latency panels at each selected
   frame. Check for hidden panels, unreadable labels or visible warnings.
5. Close/reopen the same recording and repeat the beginning/end navigation.

Write a dated text result for each action: pass, fail or not tested, with actual
setup/navigation problems. Do not infer responsiveness or ease of use from
headless SDK cursor control. A failure should lead to a bounded usability fix;
passing this check does not authorize a release or establish cross-host inference.

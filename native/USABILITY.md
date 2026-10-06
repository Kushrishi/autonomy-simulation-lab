# Build, install, replay and diagnose

Prerequisites: C++17 compiler, CMake ≥3.20, Python 3, libpng development headers.
On Debian/Ubuntu use `libpng-dev`; on macOS use Homebrew `libpng`. If installed
in a user prefix, pass `-DCMAKE_PREFIX_PATH=/absolute/prefix`. The original
preprocessing tests use only Python's standard library. Inference tests additionally
require Pillow 12.3.0 and the pinned ONNX Runtime distribution below.

## Linux x64 CPU inference: complete fresh-checkout workflow

After cloning the repository, run from its root. Downloads are external to Git;
the installed executable retains the explicitly configured ORT library path.
Moving/removing that runtime directory invalidates the installation. This is not
a portable binary bundle. macOS currently has foundation/preprocessing CI;
this pinned x64 Linux inference archive is not a macOS dependency.

```bash
ASL_WORKDIR="$(mktemp -d)"
curl --fail --location --retry 3 -o "$ASL_WORKDIR/ort.tgz" https://github.com/microsoft/onnxruntime/releases/download/v1.30.0/onnxruntime-linux-x64-1.30.0.tgz
printf '%s  %s\n' a5ed5a3cac51fbb2e90da632ae43d19212faaa20e76484e62bcb7c23ddb3b3fd "$ASL_WORKDIR/ort.tgz" | sha256sum --check
tar -xzf "$ASL_WORKDIR/ort.tgz" -C "$ASL_WORKDIR"
python3 -m venv "$ASL_WORKDIR/python"
"$ASL_WORKDIR/python/bin/pip" install Pillow==12.3.0
cmake -S native -B "$ASL_WORKDIR/build" -DCMAKE_BUILD_TYPE=Release -DASL_ONNXRUNTIME_ROOT="$ASL_WORKDIR/onnxruntime-linux-x64-1.30.0" -DPython3_EXECUTABLE="$ASL_WORKDIR/python/bin/python"
cmake --build "$ASL_WORKDIR/build" --parallel 4
ctest --test-dir "$ASL_WORKDIR/build" --output-on-failure
cmake --install "$ASL_WORKDIR/build" --prefix "$ASL_WORKDIR/install"
"$ASL_WORKDIR/install/bin/asl-replay" --help
"$ASL_WORKDIR/python/bin/python" native/tools/example.py "$ASL_WORKDIR/install/bin/asl-replay" "$ASL_WORKDIR/example"
python3 native/tools/compare.py "$ASL_WORKDIR/example/baseline.jsonl" "$ASL_WORKDIR/example/candidate.jsonl" --atol 0 --rtol 0
python3 native/tools/compare.py "$ASL_WORKDIR/example/baseline.jsonl" "$ASL_WORKDIR/example/fault/results.jsonl" --atol 0 --rtol 0
```

The final comparison deliberately exits **1** and identifies `f0`: the first
numerical output was increased by 0.25. Both real replay runs should compare
exactly with exit **0**. The fault changes a result record, not a trained model.
`fault/fault.json` records the base hash, configuration and generated file hashes.
The example refuses an existing output directory. Preserve it for review.

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
system certification. Real-sequence and real visualization validation are still
required before the current native release gate is met. No tag/release is created.

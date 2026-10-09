# Native replay

This directory contains the native recorded-input path for Autonomy Simulation Lab.

The current boundary validates the manifest and exact frame bytes, then decodes
PNG inputs into bounded RGB8 buffers. An explicit bilinear RGB8-to-float32 NCHW
preprocessing boundary now has an independent Python parity test; see
[the contract](PREPROCESSING.md). Optional pinned ONNX Runtime CPU inference,
JSONL output and a per-frame comparison command are implemented; see
[inference contracts and reproduction](INFERENCE.md).

For a complete install, two-run comparison, identified fault and bounded
benchmark, see [USABILITY.md](USABILITY.md). Authorized real-data acquisition
is described in [ACQUISITION.md](ACQUISITION.md).

## Manifest contract

Tab-separated UTF-8 with the exact header:

```text
frame_id<TAB>timestamp_ns<TAB>path<TAB>sha256
```

Rules:

- frame IDs are nonempty and unique;
- timestamps are unsigned integers and strictly increasing;
- paths are relative to the manifest directory and may not traverse outside it;
- referenced paths must resolve to regular files inside the manifest directory;
- SHA-256 declarations are 64 lowercase hexadecimal characters;
- record count and per-file byte count are bounded by the caller;
- each referenced file must match its declared SHA-256 digest.

Files are hashed with bounded streaming I/O; a complete recording is not loaded into memory.
PNG decoding additionally enforces a caller-supplied pixel-count limit before allocating
the RGB output buffer. Preprocessing rejects malformed RGB buffers and caps output allocation.

## Build

```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Debug
cmake --build native/build
ctest --test-dir native/build --output-on-failure
```

On Linux, development CI also enables AddressSanitizer and UndefinedBehaviorSanitizer.
Native CI enables the pinned ONNX Runtime CPU path on Linux x86_64 and macOS
arm64, including synthetic inference, preprocessing-reference and CLI workflow
checks. Each platform compares repeat runs locally; this does not establish
cross-platform numerical equivalence or human desktop usability. No protected
recording enters CI.

## Install with ONNX Runtime included

For an inference-enabled installation that can move without keeping the original
ONNX Runtime extraction folder, configure the reviewed runtime distribution with:

```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Release \
  -DASL_ONNXRUNTIME_ROOT=/absolute/path/to/onnxruntime-distribution \
  -DASL_BUNDLE_ONNXRUNTIME=ON
cmake --build native/build
cmake --install native/build --prefix /absolute/path/to/asl-install
```

Move the entire installation, including `bin`, `lib` and `share`. ONNX Runtime
libraries, version metadata and license notices are included. The executable uses
a relative runtime-library path. Linux and macOS CI test a moved installation with
the original runtime directory unavailable, using synthetic inference fixtures.

This bundles ONNX Runtime, not all operating-system dependencies: libpng, zlib and
a compatible C++/OS runtime must still be installed. It is not a universal binary,
a signed macOS application, or a desktop usability result. Viewer installation and
recordings remain separate; see [USABILITY.md](USABILITY.md). The default build
continues to use the explicitly configured external ONNX Runtime directory.

Validate manifest structure:

```bash
./native/build/asl-replay validate-manifest native/examples/manifest.tsv
```

Verify the referenced file bytes:

```bash
./native/build/asl-replay verify-files native/examples/manifest.tsv
```

Decode one PNG into RGB8:

```bash
./native/build/asl-replay decode-png path/to/frame.png
```

The PNG adapter uses libpng rather than a vendored image decoder. Python 3
(standard library only) is required for the original preprocessing parity test.
The optional model-specific parity test requires Pillow 12.3.0. Real-sequence
validation and visualization remain separate from this native core. No sensor
fusion, model accuracy, or cross-platform bitwise inference claim is made.

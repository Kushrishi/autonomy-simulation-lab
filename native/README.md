# Native replay

This directory contains the native recorded-input path for Autonomy Simulation Lab.

The current boundary validates the manifest and exact frame bytes, then decodes
PNG inputs into bounded RGB8 buffers. Preprocessing, inference, and visualization
remain outside this layer.

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
the RGB output buffer.

## Build

```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Debug
cmake --build native/build
ctest --test-dir native/build --output-on-failure
```

On Linux, development CI also enables AddressSanitizer and UndefinedBehaviorSanitizer.

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

The PNG adapter uses libpng rather than a vendored image decoder. The next native
boundary is an explicit model-preprocessing contract with an independent reference.
Model inference remains intentionally later.

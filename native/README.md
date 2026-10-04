# Native replay

This directory begins the native replay path for Autonomy Simulation Lab.

The first milestone is deliberately small: define and validate the recorded-input
manifest before adding decoding, preprocessing, inference, or visualization.

## Manifest contract

Tab-separated UTF-8 with the exact header:

```text
frame_id<TAB>timestamp_ns<TAB>path<TAB>sha256
```

Rules:

- frame IDs are nonempty and unique;
- timestamps are unsigned integers and strictly increasing;
- paths are nonempty;
- SHA-256 declarations are 64 lowercase hexadecimal characters;
- record count is bounded by the caller.

The current validator checks the manifest contract only. It does **not** yet read
frame bytes or verify the declared SHA-256 values against files.

## Build

```bash
cmake -S native -B native/build -DCMAKE_BUILD_TYPE=Debug
cmake --build native/build
ctest --test-dir native/build --output-on-failure
```

On Linux, development CI also enables AddressSanitizer and
UndefinedBehaviorSanitizer.

Validate a manifest:

```bash
./native/build/asl-replay validate-manifest native/examples/manifest.tsv
```

The next native milestone is byte-level file identity and bounded frame reading.
Model inference is intentionally later.

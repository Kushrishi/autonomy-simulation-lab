# Contributing

ASL contains a browser simulator and a separate native recorded-data workflow.
Choose the relevant path and describe the behavior your change improves.

## Browser

Run `npm ci`, `npm test`, `npm run lint` and `npm run build`. Planning changes
should preserve path validity and agreement with the weighted-cost reference.
Localization changes should state the observation model, units and assumptions.
The browser uses synthetic measurements; avoid claims about a real GNSS receiver.

## Native replay

Follow the [build and installation guide](native/USABILITY.md). Run CTest and the
installed synthetic example. Format C++ with `clang-format==18.1.8` using the
repository configuration; CI checks all native source, header and test files.
Linux and macOS CI cover the pinned CPU-inference
path. Frame identity, bounded decoding, preprocessing parity and no-clobber
output behavior are part of the supported contract.

Use small generated fixtures for tests. Keep recordings, downloaded models,
large outputs and private inspection screenshots outside Git. Preserve failed
outputs when diagnosing them; a detection guard does not establish the cause.
Changes to installation must also work after relocating the installed directory.

The [roadmap](ROADMAP.md) and [native acceptance record](native/RELEASE_READINESS_2026_10.md)
identify current work. Source uses the MIT license; retain notices for third-party
libraries and check dataset/model terms separately.

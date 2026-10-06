# Preprocessing contract: asl-rgb-bilinear-v1

This is an implemented transport-independent tensor preparation boundary, not
a claim of model inference or accuracy. A future model must accept this exact
contract or require a separately versioned contract before integration.

Input is contiguous RGB8, row-major HWC, width/height positive and exactly
`3 * width * height` bytes. PNG decoding retains its existing input limits.
Output is float32 contiguous NCHW, shape `[1,3,224,224]` by default. Tests may
request other dimensions; output is capped at one million pixels.

Resize directly to output dimensions (aspect ratio is **not preserved**).
There is no crop, letterbox or antialias prefilter. Bilinear sampling uses
`(output_index + 0.5) * input_size / output_size - 0.5`, clamped to input edges.
Four source samples are combined using double intermediates, horizontally then
vertically, with no intermediate integer rounding. Divide by 255, subtract RGB
means `[0.485,0.456,0.406]`, divide by `[0.229,0.224,0.225]`, then cast to float32.
No claim of equivalence to PIL/torchvision antialiased resizing is made.

The independent Python scalar reference uses plane-major iteration and seven
fixed synthetic patterns, including landscape, portrait, odd dimensions, single
rows/columns and 0/127/255 channels. No external image license is needed.
Acceptance: identical shape, finite values, max absolute difference <= 1e-6.
Repeated probe output bytes must match on the tested compiler/host. This does
not establish cross-architecture bitwise equality or runtime inference determinism.

Native CTest includes parity and five rejected fixture requests. The test probe
is not a production tensor serialization interface. Inference, output records,
comparison now exist behind optional pinned ONNX Runtime support; see
[INFERENCE.md](INFERENCE.md). Real-sequence validation remains separate.

# Recorded timing figure: publication derivative

This presentation derivative spaces the title, takeaway and legend more clearly.
It changes no measurements, pair ordering or accepted conclusions. The original
[PNG](../native_asl_matched_wall_time.png),
[generator](../make_performance_figure.py) and [source JSON](../performance_data.json) remain unchanged.

| Pair | Baseline wall time (s) | Candidate wall time (s) | Reduction |
| --- | --- | --- | --- |
| 1 | 4.141379592998419 | 3.5931763839980704 | 13.24% |
| 2 | 3.9591646699991543 | 3.628907812999387 | 8.34% |
| 3 | 3.9802216890020645 | 3.6230019760041614 | 8.97% |

**8.9749% median whole-process reduction**; separately, the accepted case study
reports **57.5238% preprocessing-stage reduction**. Three matched 108-frame pairs,
one Linux x86_64 host, MobileNetV2, ONNX Runtime 1.30.0 CPU and one thread.
Exact recorded identity/score/top-index parity excludes timings. Startup is
included; cache and scheduling were uncontrolled. No perception-accuracy,
universal-performance or uncertainty-interval claim follows.

Caption: Three matched recorded-input pairs, with exact model-output parity.
This is a whole-process timing comparison; the preprocessing-stage result is a
separate measurement. Model, runtime and data are third-party components.

Regenerate only the presentation with matplotlib and NumPy:

```bash
python3 docs/assets/render_publication_figure.py
```

This script reads retained JSON; it performs no inference or timing benchmark.
The source JSON SHA-256 is
`9abbd18cc1009551e02e814eba70a1498c82c50ba8e9d2982d7826c00f3fc23c`.
The generator asserts that rendered bar heights equal the original six floats.
Whole-process parity does not recalculate the separate preprocessing-stage result.

The accepted original SVG is retained in the private evidence archive; it was
not present in the main repository and is not newly published by this PR.

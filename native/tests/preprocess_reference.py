"""Independent scalar reference and deterministic parity fixtures; stdlib only."""

import json
import math
import struct
import subprocess
import sys


def reference(w, h, pixels, ow, oh):
    # Explicit plane-major indexing, independent of the C++ loop nesting.
    result = []
    for c, (mean, std) in enumerate(zip((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))):
        for y in range(oh):
            py = min(h - 1, max(0, (y + 0.5) * h / oh - 0.5))
            for x in range(ow):
                px = min(w - 1, max(0, (x + 0.5) * w / ow - 0.5))
                x0, y0 = math.floor(px), math.floor(py)
                dx, dy = px - x0, py - y0

                def sample(a, b):
                    return pixels[(b * w + a) * 3 + c]

                a = sample(x0, y0) * (1 - dx) + sample(min(x0 + 1, w - 1), y0) * dx
                b = (
                    sample(x0, min(y0 + 1, h - 1)) * (1 - dx)
                    + sample(min(x0 + 1, w - 1), min(y0 + 1, h - 1)) * dx
                )
                value = ((a * (1 - dy) + b * dy) / 255 - mean) / std
                result.append(struct.unpack("f", struct.pack("f", value))[0])
    return result


def main(probe):
    reports = []
    shapes = [
        (1, 1, 3, 2),
        (2, 2, 2, 2),
        (5, 3, 7, 5),
        (3, 5, 5, 7),
        (7, 1, 3, 4),
        (1, 7, 4, 3),
        (3, 2, 224, 224),
    ]
    for w, h, ow, oh in shapes:
        pixels = [(i * 73 + i // 3 * 17) % 256 for i in range(w * h * 3)]
        if w == h == 1:
            pixels = [0, 127, 255]
        request = " ".join(map(str, [w, h, ow, oh] + pixels))
        first = subprocess.check_output([probe], input=request.encode())
        assert first == subprocess.check_output([probe], input=request.encode())
        actual = list(map(float, first.split()))
        expected = reference(w, h, pixels, ow, oh)
        assert len(actual) == len(expected) == 3 * ow * oh
        errors = [abs(a - b) for a, b in zip(actual, expected)]
        assert all(math.isfinite(v) for v in actual)
        assert max(errors) <= 1e-6
        reports.append(
            {
                "input": [h, w, 3],
                "output": [1, 3, oh, ow],
                "max_abs_difference": max(errors),
                "mean_abs_difference": sum(errors) / len(errors),
                "repeated_probe_bytes_equal": True,
            }
        )
    # Independent known-value check prevents a shared RGB/layout mistake.
    exact = reference(1, 1, [0, 127, 255], 1, 1)
    assert (
        abs(exact[0] + 0.485 / 0.229) < 1e-6
        and abs(exact[2] - (1 - 0.406) / 0.225) < 1e-6
    )
    for request in [
        "0 1 2 2",
        "1 1 0 2 0 0 0",
        "1 1 1001 1000 0 0 0",
        "1 1 1 1 256 0 0",
        "2 2 1 1 0",
    ]:
        assert (
            subprocess.run(
                [probe], input=request.encode(), capture_output=True
            ).returncode
            != 0
        )
    print(
        json.dumps(
            {
                "contract": "asl-rgb-bilinear-v1",
                "tolerance": 1e-6,
                "fixtures": reports,
                "invalid_cases": 5,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main(sys.argv[1])

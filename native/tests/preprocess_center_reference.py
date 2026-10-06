"""Independent model-specific reference using Pillow 12.3.0, not ASL v1.

Matches the ONNX Model Zoo's aspect-resize/center-crop geometric contract.
"""

import json
import math
import struct
import subprocess
import sys

from PIL import Image


def main(probe):
    reports = []
    for w, h in [
        (1, 1),
        (2, 2),
        (5, 3),
        (3, 5),
        (7, 1),
        (1, 7),
        (301, 257),
        (257, 301),
    ]:
        pixels = bytes((i * 73 + i // 3 * 17) % 256 for i in range(w * h * 3))
        image = Image.frombytes("RGB", (w, h), pixels)
        ratio = 256 / min(w, h)
        rw, rh = round(w * ratio), round(h * ratio)
        resized = image.resize((rw, rh), Image.Resampling.BILINEAR)
        left, top = rw // 2 - 112, rh // 2 - 112
        cropped = resized.crop((left, top, left + 224, top + 224)).tobytes()
        expected = []
        for c, (mean, std) in enumerate(
            zip((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ):
            for value in cropped[c::3]:
                expected.append(
                    struct.unpack("f", struct.pack("f", (value / 255 - mean) / std))[0]
                )
        request = " ".join(map(str, [w, h, 224, 224] + list(pixels))).encode()
        first = subprocess.check_output([probe, "center"], input=request)
        assert first == subprocess.check_output([probe, "center"], input=request)
        actual = list(map(float, first.split()))
        assert len(actual) == len(expected) == 3 * 224 * 224
        errors = [abs(a - b) for a, b in zip(actual, expected)]
        assert all(math.isfinite(v) for v in actual)
        assert max(errors) <= 1e-6, (w, h, max(errors))
        reports.append(
            {
                "input": [h, w, 3],
                "max_abs_difference": max(errors),
                "mean_abs_difference": sum(errors) / len(errors),
            }
        )
    print(json.dumps(reports, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])

"""Installed/build CLI example and benchmark, including user-facing failures."""

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import benchmark
import example


def main(binary):
    native = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory() as t:
        report = example.example(binary, Path(t) / "example")
        assert not report["exact_repeat"]["changed_frames"]
        assert report["injected_fault"]["changed_frames"] == ["f0"]
        try:
            example.example(binary, Path(t) / "example")
        except FileExistsError:
            pass
        else:
            raise AssertionError("existing run replaced")
        for args in [[], ["-1"], ["1garbage"]]:
            if args:
                r = subprocess.run(
                    [
                        binary,
                        "validate-manifest",
                        str(native / "examples/synthetic/manifest.tsv"),
                    ]
                    + args,
                    check=False,
                    capture_output=True,
                    text=True,
                )
                assert r.returncode != 0 and "positive integer" in r.stderr
        r = benchmark.benchmark(
            binary,
            native / "examples/synthetic/manifest.tsv",
            native / "tests/fixtures/channel_means.onnx",
            example.MODEL_SHA,
            2,
        )
        assert (
            r["exact_repeat_passed"]
            and r["runs"][0]["latency"]["verify"]["p50_ms"] >= 0
        )
        malformed = Path(t) / "bad.jsonl"
        malformed.write_text("[]\n")
        r = subprocess.run(
            [
                sys.executable,
                str(native / "tools/compare.py"),
                str(malformed),
                str(malformed),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        assert (
            r.returncode == 2
            and "Traceback" not in r.stderr
            and "record must be an object" in r.stderr
        )
    print("CLI example, bounded benchmark and clear errors passed")


if __name__ == "__main__":
    main(sys.argv[1])

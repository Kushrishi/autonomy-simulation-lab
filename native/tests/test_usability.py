"""Installed/build CLI example and benchmark, including user-facing failures."""

import json
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import benchmark
import example
import compare_configurations


def main(binary):
    native = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory() as t:
        report = example.example(binary, Path(t) / "example")
        assert not report["exact_repeat"]["changed_frames"]
        assert report["injected_fault"]["changed_frames"] == ["f0"]
        executed = report["executed_configuration_comparison"]
        assert executed["changed_frames"] == ["f0", "f1"]
        assert executed["numerically_changed_frames"] == ["f0", "f1"]
        summary_path = Path(t) / "example" / executed["report"]
        comparison_path = Path(t) / "example" / executed["comparison"]
        assert summary_path.is_file() and comparison_path.is_file()
        restored = json.loads(summary_path.read_text())
        assert restored["comparison"]["changed_frames"] == executed["changed_frames"]
        assert all(run["returncode"] == 0 for run in restored["executions"])
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
        actual = compare_configurations.run(
            binary,
            native / "examples/synthetic/manifest.tsv",
            native / "tests/fixtures/channel_means.onnx",
            example.MODEL_SHA,
            Path(t) / "executed",
            "asl-imagenet-center-v1",
            "asl-rgb-bilinear-v1",
        )
        assert len(actual["executions"]) == 2
        assert actual["comparison"]["changed_frames"] == ["f0", "f1"]
        assert (
            "preprocessing" in actual["comparison"]["frames"][0]["identity_differences"]
        )
        assert (Path(t) / "executed/baseline.jsonl").is_file()
        assert (Path(t) / "executed/candidate.jsonl").is_file()
        assert all(not run["output_residue"] for run in actual["executions"])
        # Valid final output and zero exit must not hide incomplete publication.
        # Inject residue without extra model executions or changing prior records.
        for release, suffix in (
            ("baseline", ".partial"),
            ("baseline", ".lock"),
            ("candidate", ".partial"),
            ("candidate", ".lock"),
        ):
            destination = Path(t) / (release + suffix)
            calls = []

            def completed_with_residue(command, **kwargs):
                output = Path(command[command.index("--out") + 1])
                calls.append(output.stem)
                output.write_bytes((Path(t) / "executed" / output.name).read_bytes())
                if output.stem == release:
                    residue = Path(str(output) + suffix)
                    if suffix == ".partial":
                        residue.write_bytes(b"preserve diagnostic bytes")
                    else:
                        residue.mkdir()
                return subprocess.CompletedProcess(command, 0)

            with patch.object(
                compare_configurations.subprocess, "run", completed_with_residue
            ):
                try:
                    compare_configurations.run(
                        binary,
                        native / "examples/synthetic/manifest.tsv",
                        native / "tests/fixtures/channel_means.onnx",
                        example.MODEL_SHA,
                        destination,
                        "asl-imagenet-center-v1",
                        "asl-rgb-bilinear-v1",
                    )
                except ValueError as error:
                    assert "output cleanup incomplete" in str(error)
                else:
                    raise AssertionError("successful exit concealed output residue")
            expected_calls = ["baseline"] if release == "baseline" else ["baseline", "candidate"]
            assert calls == expected_calls
            assert (destination / (release + ".jsonl" + suffix)).exists()
            assert (destination / (release + ".jsonl")).is_file()
            failed = json.loads((destination / "failed.json").read_text())
            assert failed["completed"][-1]["returncode"] == 0
            assert failed["completed"][-1]["output_residue"] == [release + ".jsonl" + suffix]
            assert not (destination / "report.json").exists()
            assert not (destination / "comparison.json").exists()
        try:
            compare_configurations.run(
                binary,
                native / "examples/synthetic/manifest.tsv",
                native / "tests/fixtures/channel_means.onnx",
                example.MODEL_SHA,
                Path(t) / "executed",
                "asl-imagenet-center-v1",
                "asl-rgb-bilinear-v1",
            )
        except FileExistsError:
            pass
        else:
            raise AssertionError("existing comparison replaced")
        try:
            compare_configurations.run(
                binary,
                native / "examples/synthetic/manifest.tsv",
                native / "tests/fixtures/channel_means.onnx",
                "0" * 64,
                Path(t) / "failed-execution",
                "asl-imagenet-center-v1",
                "asl-rgb-bilinear-v1",
            )
        except ValueError:
            pass
        else:
            raise AssertionError("wrong model hash accepted")
        assert (Path(t) / "failed-execution/failed.json").is_file()
        assert not (Path(t) / "failed-execution/candidate.jsonl").exists()
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

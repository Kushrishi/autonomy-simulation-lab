"""End-to-end synthetic fixtures, independent expected means and fault checks."""

import copy
import hashlib
import importlib.util
import json
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("compare", root / "tools/compare.py")
compare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compare)
sys.path.insert(0, str(root / "tools"))
import optimization_probe


def png(path, width=3, height=2):
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    rgb = bytes([255, 0, 127]) * width
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress((b"\0" + rgb) * height))
        + chunk(b"IEND", b"")
    )


def main(binary):
    model = root / "tests/fixtures/channel_means.onnx"
    digest = hashlib.sha256(model.read_bytes()).hexdigest()
    assert digest == "436aa6e3a86b7d5d82af06c55060eb0ca3d8ca07cc60879d05fcd39e446130a0"
    with tempfile.TemporaryDirectory() as tmp:
        folder = Path(tmp)
        image = folder / "frame.png"
        png(image)
        sha = hashlib.sha256(image.read_bytes()).hexdigest()
        manifest = folder / "manifest.tsv"
        header = "frame_id\ttimestamp_ns\tpath\tsha256\n"
        good = header + f"a\t1\tframe.png\t{sha}\nb\t2\tframe.png\t{sha}\n"
        manifest.write_text(good)

        def run(name, model_sha=digest):
            return subprocess.run(
                [
                    binary,
                    "run",
                    str(manifest),
                    "--model",
                    str(model),
                    "--model-sha",
                    model_sha,
                    "--out",
                    str(folder / name),
                ],
                check=False,
                capture_output=True,
                text=True,
            )

        assert (
            subprocess.run(
                [binary, "--help"], check=False, capture_output=True
            ).returncode
            == 0
        )
        permuted = subprocess.run(
            [
                binary,
                "run",
                str(manifest),
                "--out",
                str(folder / "permuted.jsonl"),
                "--preprocessing",
                "asl-rgb-bilinear-v1",
                "--model-sha",
                digest,
                "--model",
                str(model),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        assert permuted.returncode == 0, permuted.stderr
        for extra, message in [
            (["--unknown", "x"], "unknown run option"),
            (["--model", str(model), "--model", str(model)], "duplicate run option"),
            (["--model"], "missing value"),
            ([], "required run option"),
        ]:
            bad_cli = subprocess.run(
                [binary, "run", str(manifest)] + extra,
                check=False,
                capture_output=True,
                text=True,
            )
            assert bad_cli.returncode != 0 and message in bad_cli.stderr

        all_runs = []
        for i in range(3):
            result = run(f"run{i}.jsonl")
            assert result.returncode == 0, result.stderr
            rows = compare.load(folder / f"run{i}.jsonl")
            all_runs.append(rows)
            expected = [
                (1 - 0.485) / 0.229,
                (0 - 0.456) / 0.224,
                (127 / 255 - 0.406) / 0.225,
            ]
            # ReduceMean's float accumulation differs from analytic double means.
            assert max(abs(x - y) for x, y in zip(rows[0]["output"], expected)) < 1e-3
        for rows in all_runs[1:]:
            report = compare.compare(all_runs[0], rows, atol=0, rtol=0)
            assert not report["changed_frames"]
        base = all_runs[0]
        basic_path = folder / "basic.jsonl"
        basic = subprocess.run(
            [
                binary,
                "run",
                str(manifest),
                "--model",
                str(model),
                "--model-sha",
                digest,
                "--graph-optimization",
                "basic",
                "--out",
                str(basic_path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        assert basic.returncode == 0, basic.stderr
        basic_rows = compare.load(basic_path)
        assert all(row["graph_optimization"] == "basic" for row in basic_rows)
        assert optimization_probe.equivalent(base, basic_rows)["passed"]
        changed_basic = copy.deepcopy(basic_rows)
        changed_basic[0]["input_sha256"] = "0" * 64
        assert not optimization_probe.equivalent(base, changed_basic)["passed"]
        changed_basic = copy.deepcopy(basic_rows)
        changed_basic[0]["output"][0] += 0.01
        assert not optimization_probe.equivalent(base, changed_basic)["passed"]
        assert compare.compare(base, basic_rows)["changed_frames"]  # identity differs
        for row in basic_rows:
            row["graph_optimization"] = "disabled"
        assert not compare.compare(base, basic_rows)["changed_frames"]
        invalid_path = folder / "invalid-graph.jsonl"
        invalid = subprocess.run(
            [
                binary,
                "run",
                str(manifest),
                "--model",
                str(model),
                "--model-sha",
                digest,
                "--graph-optimization",
                "unknown",
                "--out",
                str(invalid_path),
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        assert invalid.returncode != 0 and "graph optimization" in invalid.stderr
        assert not invalid_path.exists()
        assert not Path(str(invalid_path) + ".partial").exists()
        assert not Path(str(invalid_path) + ".lock").exists()
        for mutation in (
            lambda r: r.pop("model_sha256"),
            lambda r: r.update(schema="wrong"),
            lambda r: r.update(output=[float("nan")] * 3),
            lambda r: r.update(output_shape=[1, 4]),
        ):
            bad = copy.deepcopy(base[0])
            mutation(bad)
            malformed = folder / "malformed.jsonl"
            malformed.write_text(json.dumps(bad) + "\n")
            try:
                compare.load(malformed)
            except ValueError:
                pass
            else:
                raise AssertionError("malformed record accepted")
        faults = {}
        for key, value in [
            ("preprocessing", "different"),
            ("timestamp_ns", 3),
            ("model_sha256", "0" * 64),
            ("output_shape", [3, 1]),
        ]:
            changed = copy.deepcopy(base)
            changed[0][key] = value
            assert compare.compare(base, changed)["changed_frames"]
            faults[key] = "detected"
        changed = copy.deepcopy(base)
        changed[0]["output"][0] += 0.1
        assert compare.compare(base, changed)["changed_frames"]
        assert compare.compare(base, base[:1])["missing"] == ["b"]
        assert compare.compare(base[:1], base)["extra"] == ["b"]
        assert compare.compare(base, list(reversed(base)))["reordered"]
        assert run("wrong-model.jsonl", "0" * 64).returncode != 0
        assert run("run0.jsonl").returncode != 0  # preserve earlier output
        locked = folder / "locked.jsonl.lock"
        locked.mkdir()
        marker = locked / "owner.txt"
        marker.write_text("another writer")
        assert run("locked.jsonl").returncode != 0
        assert marker.read_text() == "another writer"
        assert not (folder / "locked.jsonl.partial").exists()
        partial = folder / "partial.jsonl.partial"
        partial.write_text("preserved partial evidence")
        assert run("partial.jsonl").returncode != 0
        assert partial.read_text() == "preserved partial evidence"
        bad_manifests = [
            good.replace("frame.png", "../frame.png"),
            good.replace("frame.png", "missing.png"),
            good.replace("b\t2", "a\t2"),
            good.replace("b\t2", "b\t1"),
            good.replace(sha, "0" * 64),
        ]
        for i, bad in enumerate(bad_manifests):
            manifest.write_text(bad)
            assert run(f"bad{i}.jsonl").returncode != 0
        manifest.write_text(good)
        image.write_bytes(b"not a PNG")
        manifest.write_text(
            good.replace(sha, hashlib.sha256(image.read_bytes()).hexdigest())
        )
        assert run("corrupt.jsonl").returncode != 0
        print(
            json.dumps(
                {
                    "repeated_runs": 3,
                    "max_repeated_output_error": 0,
                    "fixture_only": True,
                    "faults": faults,
                    "performance_example": compare.compare(base, all_runs[-1])[
                        "latency_ms"
                    ],
                },
                indent=2,
            )
        )


if __name__ == "__main__":
    main(sys.argv[1])

"""Independent fault provenance, exact effects and malformed-schema rejection."""

import hashlib
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import compare
import faults
from test_inference import png


def record(frame, time):
    return {
        "schema": "asl-replay-v1",
        "frame_id": frame,
        "timestamp_ns": time,
        "input_sha256": "1" * 64,
        "recording_sha256": "2" * 64,
        "model_sha256": "3" * 64,
        "preprocessing": "asl-rgb-bilinear-v1",
        "runtime": "ORT1.30.0",
        "provider": "CPU",
        "threads": 1,
        "graph_optimization": "disabled",
        "dtype": "float32",
        "output_shape": [3],
        "output": [1.0, 2.0, 3.0],
        "top_indices": [2, 1, 0],
        "latency_ms": {
            "decode": 0.1,
            "preprocess": 0.2,
            "inference": 0.3,
            "total": 0.6,
        },
    }


def main():
    with tempfile.TemporaryDirectory() as t:
        root = Path(t)
        image = root / "frame.png"
        png(image)
        digest = hashlib.sha256(image.read_bytes()).hexdigest()
        source = root / "base.tsv"
        source.write_text(
            "frame_id\ttimestamp_ns\tpath\tsha256\na\t1\tframe.png\t"
            + digest
            + "\nb\t2\tframe.png\t"
            + digest
            + "\n"
        )
        original = source.read_bytes()
        original_image = image.read_bytes()
        for kind in [
            "drop",
            "duplicate",
            "reorder",
            "timestamp",
            "wrong-hash",
            "corrupt",
        ]:
            out = root / kind
            faults.inject(source, out, "manifest", kind, delta=10)
            prov = json.loads((out / "fault.json").read_text())
            assert prov["base_sha256"] == hashlib.sha256(original).hexdigest()
            assert all(
                hashlib.sha256((out / p).read_bytes()).hexdigest() == d
                for p, d in prov["output_files"].items()
            )
            assert (
                source.read_bytes() == original and image.read_bytes() == original_image
            )
            again = root / (kind + "-again")
            faults.inject(source, again, "manifest", kind, delta=10)
            assert (out / "fault.json").read_bytes() == (
                again / "fault.json"
            ).read_bytes()
            try:
                faults.inject(source, out, "manifest", kind)
            except ValueError:
                pass
            else:
                raise AssertionError("existing evidence overwritten")
        base = root / "baseline.jsonl"
        base.write_text(
            "".join(
                json.dumps(record(f, i + 1)) + "\n" for i, f in enumerate(["a", "b"])
            )
        )
        for kind in [
            "drop",
            "reorder",
            "timestamp",
            "numeric",
            "model-identity",
            "preprocessing-identity",
        ]:
            path = faults.inject(
                base, root / ("result-" + kind), "result", kind, delta=10
            )
            report = compare.compare(compare.load(base), compare.load(path))
            assert report["missing"] or report["reordered"] or report["changed_frames"]
        for kind in ["duplicate", "shape"]:
            path = faults.inject(base, root / ("result-" + kind), "result", kind)
            try:
                compare.load(path)
            except ValueError:
                pass
            else:
                raise AssertionError("malformed result admitted")
        poses = root / "poses.jsonl"
        poses.write_text(
            "".join(
                json.dumps(
                    {
                        "frame_id": f,
                        "timestamp_ns": i,
                        "oxts_timestamp_ns": i,
                        "skew_ns": 0,
                        "position_enu_m": [i, 0, 0],
                    }
                )
                + "\n"
                for i, f in enumerate(["a", "b"])
            )
        )
        p = faults.inject(poses, root / "bias", "spatial", "enu-bias", delta=2.5)
        changed = [json.loads(l) for l in p.read_text().splitlines()]
        assert [r["position_enu_m"][0] for r in changed] == [2.5, 3.5]
        p = faults.inject(poses, root / "skew", "spatial", "oxts-skew", delta=100)
        assert json.loads(p.read_text().splitlines()[0])["skew_ns"] == 100
        p = faults.inject(poses, root / "missing", "spatial", "missing-pose")
        assert len(p.read_text().splitlines()) == 1
        for mutate in [
            lambda r: r.update(output=[True, 2, 3]),
            lambda r: r.update(output_shape=[True, 3]),
            lambda r: r.update(top_indices=[0, 1, 2]),
            lambda r: r.update(threads=True),
            lambda r: r.update(latency_ms={}),
            lambda r: r.update(preprocessing=""),
        ]:
            row = record("a", 1)
            mutate(row)
            try:
                compare.loads((json.dumps(row) + "\n").encode())
            except ValueError:
                pass
            else:
                raise AssertionError("invalid schema accepted")
        bad = root / "bad.tsv"
        bad.write_text(source.read_text().replace(digest, "0" * 64))
        try:
            faults.inject(bad, root / "rejected", "manifest", "drop")
        except ValueError:
            assert not (root / "rejected").exists()
        else:
            raise AssertionError("unverified base accepted")
    print(
        "fault tooling: 6 input, 8 result, 3 spatial faults; provenance and schema checks passed"
    )


if __name__ == "__main__":
    main()

"""Bounded replay comparison. Thresholds are explicit, never fitted to a candidate."""

from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path


def load(path):
    if Path(path).stat().st_size > 134217728:
        raise ValueError("result file exceeds 128 MiB bound")
    records = []
    with Path(path).open() as stream:
        for line in stream:
            if len(line) > 32_000_000 or len(records) >= 10_000:
                raise ValueError("record bound exceeded")
            row = json.loads(line)
            if row.get("schema") != "asl-replay-v1":
                raise ValueError("unsupported schema")
            required = (
                "frame_id",
                "timestamp_ns",
                "input_sha256",
                "recording_sha256",
                "model_sha256",
                "preprocessing",
                "runtime",
                "provider",
                "threads",
                "graph_optimization",
                "dtype",
                "output_shape",
                "output",
                "top_indices",
                "latency_ms",
            )
            if any(key not in row for key in required):
                raise ValueError("incomplete record")
            if not isinstance(row["frame_id"], str) or not row["frame_id"]:
                raise ValueError("invalid frame identity")
            if type(row["timestamp_ns"]) is not int or row["timestamp_ns"] < 0:
                raise ValueError("invalid timestamp")
            if any(
                not isinstance(row[k], str) or not re.fullmatch("[a-f0-9]{64}", row[k])
                for k in ("input_sha256", "recording_sha256", "model_sha256")
            ):
                raise ValueError("invalid identity hash")
            if row["dtype"] != "float32":
                raise ValueError("unsupported dtype")
            values = row["output"]
            if (
                not values
                or len(values) > 1_000_000
                or not all(
                    isinstance(v, (int, float)) and math.isfinite(v) for v in values
                )
            ):
                raise ValueError("invalid numerical output")
            shape = row["output_shape"]
            if (
                not shape
                or any(not isinstance(v, int) or v <= 0 for v in shape)
                or math.prod(shape) != len(values)
            ):
                raise ValueError("output shape mismatch")
            records.append(row)
    ids = [r["frame_id"] for r in records]
    if not ids or len(set(ids)) != len(ids):
        raise ValueError("empty or duplicate frame records")
    return records


def percentile(values, p):
    values = sorted(values)
    x = (len(values) - 1) * p
    lo = int(x)
    hi = min(lo + 1, len(values) - 1)
    return values[lo] + (values[hi] - values[lo]) * (x - lo)


def compare(baseline, candidate, atol=1e-6, rtol=1e-6):
    if not math.isfinite(atol) or not math.isfinite(rtol) or min(atol, rtol) < 0:
        raise ValueError("invalid tolerance")
    a, b = {r["frame_id"]: r for r in baseline}, {r["frame_id"]: r for r in candidate}
    common = [r["frame_id"] for r in baseline if r["frame_id"] in b]
    report = {
        "tolerance": {"atol": atol, "rtol": rtol},
        "missing": sorted(a.keys() - b.keys()),
        "extra": sorted(b.keys() - a.keys()),
        "reordered": common != [r["frame_id"] for r in candidate if r["frame_id"] in a],
        "frames": [],
    }
    keys = (
        "schema",
        "recording_sha256",
        "input_sha256",
        "model_sha256",
        "preprocessing",
        "timestamp_ns",
        "runtime",
        "provider",
        "threads",
        "graph_optimization",
        "dtype",
        "output_shape",
    )
    for frame in common:
        left, right = a[frame], b[frame]
        mismatches = [key for key in keys if left.get(key) != right.get(key)]
        row = {
            "frame_id": frame,
            "identity_differences": mismatches,
            "top_indices_changed": left.get("top_indices") != right.get("top_indices"),
        }
        if (
            len(left["output"]) == len(right["output"])
            and left["output_shape"] == right["output_shape"]
        ):
            errors = [abs(x - y) for x, y in zip(left["output"], right["output"])]
            row.update(
                max_abs_error=max(errors),
                mean_abs_error=sum(errors) / len(errors),
                numerical_changed=any(
                    abs(x - y) > atol + rtol * abs(x)
                    for x, y in zip(left["output"], right["output"])
                ),
            )
        else:
            row.update(numerical_changed=True, max_abs_error=None, mean_abs_error=None)
        report["frames"].append(row)
    report["changed_frames"] = [
        r["frame_id"]
        for r in report["frames"]
        if r["numerical_changed"]
        or r["identity_differences"]
        or r["top_indices_changed"]
    ]
    report["latency_ms"] = {}
    for label, records in (("baseline", baseline), ("candidate", candidate)):
        report["latency_ms"][label] = {}
        for stage in ("decode", "preprocess", "inference", "total"):
            values = [r["latency_ms"][stage] for r in records]
            if not all(
                isinstance(v, (int, float)) and math.isfinite(v) and v >= 0
                for v in values
            ):
                raise ValueError("invalid latency")
            report["latency_ms"][label][stage] = {
                "p50": percentile(values, 0.5),
                "p95": percentile(values, 0.95),
            }
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--atol", type=float, default=1e-6)
    parser.add_argument("--rtol", type=float, default=1e-6)
    args = parser.parse_args()
    report = compare(load(args.baseline), load(args.candidate), args.atol, args.rtol)
    print(json.dumps(report, indent=2, allow_nan=False))
    return (
        1
        if report["missing"]
        or report["extra"]
        or report["reordered"]
        or report["changed_frames"]
        else 0
    )


if __name__ == "__main__":
    raise SystemExit(main())

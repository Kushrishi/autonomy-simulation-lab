"""Deterministic local fault fixtures with immutable base identity; no downloads.

Manifest faults copy verified bounded inputs into a NEW directory. Result and
spatial faults alter recorded evidence only; they do not execute a changed model
or imply that a pose perturbation changes image inference.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import shutil
from pathlib import Path

from compare import loads


def sha(data):
    return hashlib.sha256(data).hexdigest()


def bounded(path, limit=64 * 1024 * 1024):
    with Path(path).open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("input exceeds byte bound")
    return data


def inject(source, output, domain, kind, index=0, delta=1):
    source, output = Path(source).resolve(), Path(output).absolute()
    if output.exists() or not output.parent.is_dir():
        raise ValueError("new output directory and existing parent required")
    base = bounded(source, 128 * 1024 * 1024)
    if type(index) is not int or index < 0 or not math.isfinite(delta):
        raise ValueError("invalid fault configuration")
    config = {"domain": domain, "kind": kind, "index": index, "delta": delta}
    # The exclusive output directory owns only this invocation's fixture.
    output.mkdir()
    try:
        provenance = {
            "schema": "asl-fault-v1",
            "base_sha256": sha(base),
            "configuration": config,
            "source_files": {},
            "effect_scope": "record perturbation; no downstream algorithm claim",
        }
        if domain == "manifest":
            reader = csv.DictReader(io.StringIO(base.decode("utf-8")), delimiter="\t")
            if reader.fieldnames != ["frame_id", "timestamp_ns", "path", "sha256"]:
                raise ValueError("invalid manifest header")
            rows = list(reader)
            if not rows or len(rows) > 10000 or index >= len(rows):
                raise ValueError("invalid selected frame/count")
            ids, total, previous = set(), 0, -1
            for row in rows:
                path = (source.parent / row["path"]).resolve()
                path.relative_to(source.parent)
                timestamp = int(row["timestamp_ns"])
                if (
                    not row["frame_id"]
                    or row["frame_id"] in ids
                    or timestamp <= previous
                ):
                    raise ValueError(
                        "base recording must have unique IDs and ordered timestamps"
                    )
                if Path(row["path"]).is_absolute() or ".." in Path(row["path"]).parts:
                    raise ValueError("unsafe base input path")
                data = bounded(path)
                if sha(data) != row["sha256"]:
                    raise ValueError("base input hash mismatch")
                total += len(data)
                if total > 256 * 1024 * 1024:
                    raise ValueError("fixture exceeds aggregate byte bound")
                dest = output / row["path"]
                dest.parent.mkdir(parents=True, exist_ok=True)
                if dest.name in {"manifest.tsv", "fault.json"} or dest == output:
                    raise ValueError("reserved fixture path")
                dest.write_bytes(data)
                provenance["source_files"][row["path"]] = sha(data)
                ids.add(row["frame_id"])
                previous = timestamp
            if kind == "drop":
                rows.pop(index)
            elif kind == "duplicate":
                rows.insert(index, rows[index].copy())
            elif kind == "reorder":
                if index + 1 >= len(rows):
                    raise ValueError("reorder requires following frame")
                rows[index], rows[index + 1] = rows[index + 1], rows[index]
            elif kind == "timestamp":
                if delta != int(delta):
                    raise ValueError("timestamp delta must be integer nanoseconds")
                rows[index]["timestamp_ns"] = str(
                    int(rows[index]["timestamp_ns"]) + int(delta)
                )
            elif kind == "wrong-hash":
                rows[index]["sha256"] = "0" * 64
            elif kind == "corrupt":
                p = output / rows[index]["path"]
                data = bytearray(p.read_bytes())
                if not data:
                    raise ValueError("cannot corrupt empty input")
                data[0] ^= 1
                p.write_bytes(data)
                # Keep declared original SHA: integrity must fail before decode.
            else:
                raise ValueError("unsupported manifest fault")
            dest = output / "manifest.tsv"
            with dest.open("w", newline="") as stream:
                writer = csv.DictWriter(
                    stream,
                    fieldnames=reader.fieldnames,
                    delimiter="\t",
                    lineterminator="\n",
                )
                writer.writeheader()
                writer.writerows(rows)
            provenance["expected_effect"] = (
                "comparison detects missing frame"
                if kind == "drop"
                else (
                    "timestamp/config identity changes or ordering rejection"
                    if kind == "timestamp"
                    else "native validation/integrity rejection"
                )
            )
        else:
            rows = (
                loads(base)
                if domain == "result"
                else [json.loads(x) for x in base.decode().splitlines()]
            )
            if not rows or len(rows) > 10000 or index >= len(rows):
                raise ValueError("invalid selected record/count")
            if domain == "result":
                if kind == "drop":
                    rows.pop(index)
                elif kind == "duplicate":
                    rows.insert(index, rows[index].copy())
                elif kind == "reorder":
                    if index + 1 >= len(rows):
                        raise ValueError("reorder requires following record")
                    rows[index], rows[index + 1] = rows[index + 1], rows[index]
                elif kind == "timestamp":
                    if delta != int(delta):
                        raise ValueError("timestamp delta must be integer nanoseconds")
                    rows[index]["timestamp_ns"] += int(delta)
                elif kind == "numeric":
                    rows[index]["output"][0] += delta
                    rows[index]["top_indices"] = sorted(
                        range(len(rows[index]["output"])),
                        key=lambda i: (-rows[index]["output"][i], i),
                    )[:5]
                elif kind == "model-identity":
                    rows[index]["model_sha256"] = "0" * 64
                elif kind == "preprocessing-identity":
                    rows[index]["preprocessing"] = "injected-contract-change"
                elif kind == "shape":
                    rows[index]["output_shape"] = [len(rows[index]["output"]) + 1]
                else:
                    raise ValueError("unsupported result fault")
                provenance["expected_effect"] = (
                    "comparison difference or malformed-record rejection"
                )
            elif domain == "spatial":
                for r in rows:
                    pos = r.get("position_enu_m")
                    if (
                        not isinstance(pos, list)
                        or len(pos) != 3
                        or any(
                            type(v) not in (int, float) or not math.isfinite(v)
                            for v in pos
                        )
                    ):
                        raise ValueError("invalid finite ENU spatial record")
                if kind == "enu-bias":
                    for r in rows:
                        r["position_enu_m"][0] += delta
                    provenance["expected_effect"] = (
                        "all ENU east positions change by declared metres; image inference unchanged"
                    )
                elif kind == "oxts-skew":
                    if delta != int(delta):
                        raise ValueError("skew delta must be integer nanoseconds")
                    rows[index]["oxts_timestamp_ns"] += int(delta)
                    rows[index]["skew_ns"] = (
                        rows[index]["oxts_timestamp_ns"] - rows[index]["timestamp_ns"]
                    )
                    provenance["expected_effect"] = (
                        "spatial timestamp/skew change only; image inference unchanged"
                    )
                elif kind == "missing-pose":
                    rows.pop(index)
                    provenance["expected_effect"] = (
                        "missing spatial record; image inference unchanged"
                    )
                else:
                    raise ValueError("unsupported spatial fault")
            else:
                raise ValueError("unsupported domain")
            dest = output / ("results.jsonl" if domain == "result" else "spatial.jsonl")
            dest.write_text(
                "".join(
                    json.dumps(r, allow_nan=False, sort_keys=True) + "\n" for r in rows
                )
            )
        provenance["output_files"] = {
            p.relative_to(output).as_posix(): sha(p.read_bytes())
            for p in sorted(output.rglob("*"))
            if p.is_file()
        }
        (output / "fault.json").write_text(
            json.dumps(provenance, indent=2, sort_keys=True, allow_nan=False) + "\n"
        )
        return dest
    except Exception:
        # Only this newly created, owned fixture is rolled back; source untouched.
        shutil.rmtree(output)
        raise


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("domain", choices=["manifest", "result", "spatial"])
    p.add_argument("source", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--kind", required=True)
    p.add_argument("--index", type=int, default=0)
    p.add_argument("--delta", type=float, default=1)
    a = p.parse_args()
    try:
        print(inject(a.source, a.output, a.domain, a.kind, a.index, a.delta))
    except (ValueError, OSError, KeyError, TypeError) as e:
        p.exit(2, f"fault fixture failed: {e}\n")


if __name__ == "__main__":
    main()

"""Optional local Rerun export. Native replay remains viewer independent."""

import argparse
import csv
import hashlib
import io
import json
import math
from itertools import pairwise
from pathlib import Path

from compare import load, result_digest
from kitti_adapter import snapshot


def prepare(manifest, results, spatial=None, comparison=None):
    """Validate bounded immutable snapshots without importing optional Rerun."""
    manifest = Path(manifest).resolve()
    data = snapshot(manifest, 2_000_000)
    recording_hash = hashlib.sha256(data).hexdigest()
    reader = csv.DictReader(io.StringIO(data.decode()), delimiter="\t")
    if reader.fieldnames != ["frame_id", "timestamp_ns", "path", "sha256"]:
        raise ValueError("invalid viewer manifest header")
    frame_rows = list(reader)
    records = load(results)
    ids = [r["frame_id"] for r in frame_rows]
    if len(ids) != len(set(ids)) or ids != [r["frame_id"] for r in records]:
        raise ValueError("viewer requires exact ordered manifest/result frame coverage")
    if any(b["timestamp_ns"] <= a["timestamp_ns"] for a, b in pairwise(records)):
        raise ValueError("viewer timestamps must strictly increase")
    frames = dict(zip(ids, frame_rows))
    poses = {}
    if spatial is not None:
        rows = [
            json.loads(x) for x in snapshot(spatial, 16_000_000).decode().splitlines()
        ]
        if (
            any(not isinstance(r, dict) for r in rows)
            or [r.get("frame_id") for r in rows] != ids
        ):
            raise ValueError("viewer requires exact ordered spatial frame coverage")
        for row in rows:
            position = row.get("position_enu_m")
            if (
                not isinstance(position, list)
                or len(position) != 3
                or any(
                    type(v) not in (int, float) or not math.isfinite(v)
                    for v in position
                )
            ):
                raise ValueError("viewer requires finite three-component ENU position")
            if any(
                type(row.get(k)) is not int
                for k in ("timestamp_ns", "oxts_timestamp_ns", "skew_ns")
            ):
                raise ValueError("viewer requires integer spatial timestamps/skew")
            if row["oxts_timestamp_ns"] - row["timestamp_ns"] != row["skew_ns"]:
                raise ValueError("viewer spatial skew disagrees with timestamps")
            poses[row["frame_id"]] = row
    changes = set()
    if comparison is not None:
        report = json.loads(snapshot(comparison, 16_000_000))
        if not isinstance(report, dict):
            raise ValueError("viewer comparison must be an object")
        identities = report.get("result_identities")
        if (
            not isinstance(identities, dict)
            or set(identities) != {"baseline", "candidate"}
            or any(
                not isinstance(value, str)
                or len(value) != 64
                or any(c not in "0123456789abcdef" for c in value)
                for value in identities.values()
            )
            or result_digest(records) not in identities.values()
        ):
            raise ValueError("viewer comparison is not bound to the loaded results")
        changed = report.get("changed_frames")
        if (
            not isinstance(changed, list)
            or any(not isinstance(frame, str) for frame in changed)
            or len(changed) != len(set(changed))
        ):
            raise ValueError("viewer changed frames must be unique string IDs")
        changes = set(changed)
    if not changes <= set(ids):
        raise ValueError("viewer comparison references unknown frames")
    images = []
    total_bytes = 0
    for row in records:
        if row["recording_sha256"] != recording_hash:
            raise ValueError("viewer recording identity mismatch")
        frame = frames[row["frame_id"]]
        image = (manifest.parent / frame["path"]).resolve()
        image.relative_to(manifest.parent.resolve())
        if Path(frame["path"]).is_absolute() or ".." in Path(frame["path"]).parts:
            raise ValueError("unsafe viewer image path")
        data = snapshot(image, 64 * 1024 * 1024)
        total_bytes += len(data)
        if total_bytes > 256 * 1024 * 1024:
            raise ValueError("viewer image snapshot aggregate exceeds 256 MiB")
        if (
            hashlib.sha256(data).hexdigest() != row["input_sha256"]
            or frame["sha256"] != row["input_sha256"]
        ):
            raise ValueError("viewer frame identity mismatch")
        if int(frame["timestamp_ns"]) != row["timestamp_ns"]:
            raise ValueError("viewer timestamp mismatch")
        if (
            row["frame_id"] in poses
            and poses[row["frame_id"]]["timestamp_ns"] != row["timestamp_ns"]
        ):
            raise ValueError("viewer pose timestamp mismatch")
        images.append(data)
    return recording_hash, records, poses, changes, images


def export(manifest, results, output, spatial=None, comparison=None):
    import rerun as rr

    recording_hash, records, poses, changes, images = prepare(
        manifest, results, spatial, comparison
    )
    # Exclusive reservation prevents two exports overwriting the same output.
    # SDK/I/O failure may leave a partial owned artifact; preserve it for diagnosis.
    output = Path(output)
    with output.open("xb"):
        pass
    rr.init("asl_replay", recording_id=recording_hash[:32], spawn=False, strict=True)
    rr.save(output)
    origin_time = records[0]["timestamp_ns"]
    for i, (row, image) in enumerate(zip(records, images)):
        rr.set_time("frame", sequence=i)
        rr.set_time("elapsed", duration=(row["timestamp_ns"] - origin_time) / 1e9)
        rr.log("camera", rr.EncodedImage(contents=image, media_type="image/png"))
        rr.log("inference/top_indices", rr.TextLog(str(row["top_indices"])))
        rr.log("latency/inference_ms", rr.Scalars(row["latency_ms"]["inference"]))
        rr.log("latency/total_ms", rr.Scalars(row["latency_ms"]["total"]))
        rr.log("regression/changed", rr.Scalars(int(row["frame_id"] in changes)))
        if row["frame_id"] in poses:
            pose = poses[row["frame_id"]]
            rr.log("trajectory/position_enu_m", rr.Points3D([pose["position_enu_m"]]))
            rr.log("synchronization/skew_ns", rr.Scalars(pose["skew_ns"]))
    rr.get_global_data_recording().flush()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("manifest", type=Path)
    p.add_argument("results", type=Path)
    p.add_argument("output", type=Path)
    p.add_argument("--spatial", type=Path)
    p.add_argument("--comparison", type=Path)
    a = p.parse_args()
    try:
        export(a.manifest, a.results, a.output, a.spatial, a.comparison)
    except (ValueError, OSError, KeyError, TypeError, ImportError) as error:
        p.exit(2, f"viewer export failed: {error}\n")


if __name__ == "__main__":
    main()

"""Optional local Rerun export. Native replay remains viewer independent."""

import argparse
import csv
import hashlib
import json
from pathlib import Path

import rerun as rr
from compare import load


def export(manifest, results, output, spatial=None, comparison=None):
    manifest, results, output = Path(manifest), Path(results), Path(output)
    if output.exists():
        raise ValueError("viewer output already exists")
    recording_hash = hashlib.sha256(manifest.read_bytes()).hexdigest()
    frames = {r["frame_id"]: r for r in csv.DictReader(manifest.open(), delimiter="\t")}
    records = load(results)
    poses = (
        {}
        if spatial is None
        else {
            r["frame_id"]: r
            for r in map(json.loads, Path(spatial).read_text().splitlines())
        }
    )
    changes = (
        set()
        if comparison is None
        else set(json.loads(Path(comparison).read_text())["changed_frames"])
    )
    images = []
    for row in records:
        if row["recording_sha256"] != recording_hash:
            raise ValueError("viewer recording identity mismatch")
        frame = frames[row["frame_id"]]
        image = (manifest.parent / frame["path"]).resolve()
        image.relative_to(manifest.parent.resolve())
        if (
            image.stat().st_size > 536870912
            or hashlib.sha256(image.read_bytes()).hexdigest() != row["input_sha256"]
        ):
            raise ValueError("viewer frame identity mismatch")
        if int(frame["timestamp_ns"]) != row["timestamp_ns"]:
            raise ValueError("viewer timestamp mismatch")
        if (
            row["frame_id"] in poses
            and poses[row["frame_id"]]["timestamp_ns"] != row["timestamp_ns"]
        ):
            raise ValueError("viewer pose timestamp mismatch")
        images.append(image)
    rr.init("asl_replay", recording_id=recording_hash[:32], spawn=False, strict=True)
    rr.save(output)
    origin_time = records[0]["timestamp_ns"]
    for i, (row, image) in enumerate(zip(records, images)):
        rr.set_time("frame", sequence=i)
        rr.set_time("elapsed", duration=(row["timestamp_ns"] - origin_time) / 1e9)
        rr.log("camera", rr.EncodedImage(path=image))
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
    export(a.manifest, a.results, a.output, a.spatial, a.comparison)


if __name__ == "__main__":
    main()

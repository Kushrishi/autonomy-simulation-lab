"""Local KITTI synced/rectified adapter. Never downloads or redistributes data.

Index-aligned camera/OXTS records retain BOTH timestamps and a bounded skew.
WGS84 geodetic positions become local ENU positions; this is not sensor fusion.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import os
from itertools import pairwise
from pathlib import Path


def timestamp_ns(text):
    base, fraction = text.strip().split(".")
    if not fraction.isdigit() or len(fraction) > 9:
        raise ValueError("invalid timestamp fraction")
    date = dt.datetime.strptime(base, "%Y-%m-%d %H:%M:%S").replace(
        tzinfo=dt.timezone.utc
    )
    seconds = int(
        (date - dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)).total_seconds()
    )
    return seconds * 1_000_000_000 + int(fraction.ljust(9, "0"))


def snapshot(path, limit):
    """Bounded bytes: parse and hash this same snapshot, never a second read."""
    with Path(path).open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("input exceeds adapter byte bound")
    return data


def times(path, data=None):
    data = snapshot(path, 2_000_000) if data is None else data
    result = [timestamp_ns(line) for line in data.decode().splitlines()]
    if not result or len(result) > 10000 or any(b <= a for a, b in pairwise(result)):
        raise ValueError("empty, oversized or nonmonotonic timestamp stream")
    return result


def digest(path):
    if path.stat().st_size > 536870912:
        raise ValueError("file too large")
    h = hashlib.sha256()
    size = 0
    with path.open("rb") as f:
        while block := f.read(1048576):
            size += len(block)
            if size > 536870912:
                raise ValueError("file exceeds adapter byte bound while reading")
            h.update(block)
    return h.hexdigest()


def ecef(lat, lon, altitude):
    if (
        not all(math.isfinite(v) for v in (lat, lon, altitude))
        or not -90 <= lat <= 90
        or not -180 <= lon <= 180
    ):
        raise ValueError("invalid geodetic position")
    latitude, longitude = math.radians(lat), math.radians(lon)
    a, e2 = 6378137.0, 6.6943799901413165e-3
    n = a / math.sqrt(1 - e2 * math.sin(latitude) ** 2)
    return [
        (n + altitude) * math.cos(latitude) * math.cos(longitude),
        (n + altitude) * math.cos(latitude) * math.sin(longitude),
        (n * (1 - e2) + altitude) * math.sin(latitude),
    ]


def enu(position, origin):
    delta = [a - b for a, b in zip(ecef(*position), ecef(*origin))]
    lat, lon = math.radians(origin[0]), math.radians(origin[1])
    x, y, z = delta
    return [
        -math.sin(lon) * x + math.cos(lon) * y,
        -math.sin(lat) * math.cos(lon) * x
        - math.sin(lat) * math.sin(lon) * y
        + math.cos(lat) * z,
        math.cos(lat) * math.cos(lon) * x
        + math.cos(lat) * math.sin(lon) * y
        + math.sin(lat) * z,
    ]


def validate_rotation(values, tolerance=1e-5):
    """Row-major proper rotation: orthonormal rows and determinant +1.

    Tolerance admits rounding in text calibration exports, not arbitrary scale,
    shear or reflections. This does not establish real-data extrinsic accuracy.
    """
    if len(values) != 9 or not all(math.isfinite(v) for v in values):
        raise ValueError("invalid rotation matrix")
    rows = [values[i : i + 3] for i in (0, 3, 6)]
    for i in range(3):
        for j in range(3):
            dot = sum(a * b for a, b in zip(rows[i], rows[j]))
            if abs(dot - (1 if i == j else 0)) > tolerance:
                raise ValueError("calibration rotation is not orthonormal")
    a, b, c, d, e, f, g, h, i = values
    determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
    if abs(determinant - 1) > tolerance:
        raise ValueError("calibration rotation must have determinant +1")


def validate_inventory(directory, suffix, count):
    """Check complete index-aligned names without opening source payloads."""
    expected = {f"{i:010}{suffix}" for i in range(count)}
    found = set()
    with os.scandir(directory) as entries:
        for index, entry in enumerate(entries):
            if index >= 10000:
                raise ValueError("frame inventory exceeds adapter entry bound")
            if entry.name not in expected or not entry.is_file():
                raise ValueError("unexpected frame inventory entry")
            found.add(entry.name)
    if found != expected:
        raise ValueError("frame inventory does not match timestamp count")


def adapt(sequence, calibration, limit=12, max_skew_ns=50_000_000):
    sequence, calibration = Path(sequence).resolve(), Path(calibration).resolve()
    if not sequence.name.endswith("_sync") or not 1 <= limit <= 1000 or max_skew_ns < 0:
        raise ValueError("synced sequence and bounded selection required")
    camera_bytes = snapshot(sequence / "image_02/timestamps.txt", 2_000_000)
    pose_bytes = snapshot(sequence / "oxts/timestamps.txt", 2_000_000)
    camera = times(None, camera_bytes)
    pose = times(None, pose_bytes)
    if len(camera) != len(pose):
        raise ValueError("camera/OXTS timestamp counts differ")
    validate_inventory(sequence / "image_02/data", ".png", len(camera))
    validate_inventory(sequence / "oxts/data", ".txt", len(pose))
    outputs = [
        sequence / n
        for n in ("asl-manifest.tsv", "asl-spatial.jsonl", "asl-provenance.json")
    ]
    if any(p.exists() for p in outputs):
        raise ValueError("adapter output exists; preserve earlier identity")
    calibration_hashes = {}
    for name in (
        "calib_cam_to_cam.txt",
        "calib_imu_to_velo.txt",
        "calib_velo_to_cam.txt",
    ):
        path = calibration / name
        data = snapshot(path, 65536)
        rows = dict(
            line.split(":", 1) for line in data.decode().splitlines() if ":" in line
        )
        keys = (
            ("P_rect_02", "R_rect_00") if name == "calib_cam_to_cam.txt" else ("R", "T")
        )
        for key in keys:
            values = [float(v) for v in rows[key].split()]
            expected = 12 if key == "P_rect_02" else 3 if key == "T" else 9
            if len(values) != expected or not all(math.isfinite(v) for v in values):
                raise ValueError("invalid calibration values")
            if key in ("R", "R_rect_00"):
                validate_rotation(values)
        calibration_hashes[name] = hashlib.sha256(data).hexdigest()
    lines = ["frame_id\ttimestamp_ns\tpath\tsha256"]
    spatial, origin = [], None
    for i in range(min(limit, len(camera))):
        frame = f"{i:010}"
        relative = f"image_02/data/{frame}.png"
        image = (sequence / relative).resolve()
        image.relative_to(sequence)  # no escaping symlink
        path = sequence / f"oxts/data/{frame}.txt"
        path.resolve().relative_to(sequence)
        data = snapshot(path, 4096)
        values = [float(v) for v in data.decode().split()]
        if len(values) != 30 or not all(math.isfinite(v) for v in values):
            raise ValueError("expected finite 30-field OXTS record")
        skew = pose[i] - camera[i]
        if abs(skew) > max_skew_ns:
            raise ValueError("camera/OXTS timestamp skew exceeds declared bound")
        position = values[:3]
        if origin is None:
            origin = position
        local = enu(position, origin)
        lines.append(f"{frame}\t{camera[i]}\t{relative}\t{digest(image)}")
        spatial.append(
            {
                "frame_id": frame,
                "timestamp_ns": camera[i],
                "oxts_timestamp_ns": pose[i],
                "skew_ns": skew,
                "position_enu_m": local,
                "geodetic_lat_lon_alt": position,
                "roll_pitch_yaw_rad": values[3:6],
                "oxts_sha256": hashlib.sha256(data).hexdigest(),
            }
        )
    # Validate every selected record first; no partially accepted recording.
    manifest_text = "\n".join(lines) + "\n"
    payloads = [
        manifest_text,
        "".join(json.dumps(row, allow_nan=False) + "\n" for row in spatial),
        json.dumps(
            {
                "adapter": "asl-kitti-sync-v1",
                "sequence": sequence.name,
                "selection": "first index-aligned frames",
                "frames": len(spatial),
                "source_frames": len(camera),
                "max_skew_ns": max_skew_ns,
                "timestamp_interpretation": "naive KITTI clock represented as UTC; absolute UTC accuracy not claimed",
                "coordinate_frame": "WGS84 ECEF to ENU at first OXTS position; metres",
                "origin_lat_lon_alt": origin,
                "calibration_sha256": calibration_hashes,
                "camera_timestamps_sha256": hashlib.sha256(camera_bytes).hexdigest(),
                "oxts_timestamps_sha256": hashlib.sha256(pose_bytes).hexdigest(),
                "manifest_sha256": hashlib.sha256(manifest_text.encode()).hexdigest(),
                "sensor_fusion": False,
            },
            indent=2,
        )
        + "\n",
    ]
    for path, payload in zip(outputs, payloads):
        with path.open("x", encoding="utf-8", newline="") as stream:
            stream.write(payload)
    return outputs


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("sequence", type=Path)
    p.add_argument("calibration", type=Path)
    p.add_argument("--limit", type=int, default=12)
    p.add_argument("--max-skew-ns", type=int, default=50_000_000)
    a = p.parse_args()
    try:
        outputs = adapt(a.sequence, a.calibration, a.limit, a.max_skew_ns)
    except (ValueError, OSError, KeyError, TypeError) as error:
        p.exit(2, f"sequence import failed: {error}\n")
    for path in outputs:
        print(path)


if __name__ == "__main__":
    main()

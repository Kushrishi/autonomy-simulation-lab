"""Synthetic KITTI-shaped metadata only. No dataset acquisition or raw data."""

import hashlib
import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import kitti_adapter as adapter
from test_inference import png


def fixture(root):
    seq = root / "2011_09_26_drive_0001_sync"
    for folder in ("image_02/data", "oxts/data"):
        (seq / folder).mkdir(parents=True)
    stamps = "2011-09-26 13:02:45.000000001\n2011-09-26 13:02:45.100000001\n"
    for folder in ("image_02", "oxts"):
        (seq / folder / "timestamps.txt").write_text(stamps)
    for i in range(2):
        png(seq / f"image_02/data/{i:010}.png")
        values = [49.0 + i * 1e-5, 8.0, 100.0, 0.0, 0.0, 0.0] + [0.0] * 24
        (seq / f"oxts/data/{i:010}.txt").write_text(" ".join(map(str, values)))
    calib = root / "calibration"
    calib.mkdir()
    (calib / "calib_cam_to_cam.txt").write_text(
        "P_rect_02: 1 0 0 0 0 1 0 0 0 0 1 0\nR_rect_00: 1 0 0 0 1 0 0 0 1\n"
    )
    for name in ("calib_imu_to_velo.txt", "calib_velo_to_cam.txt"):
        (calib / name).write_text("R: 1 0 0 0 1 0 0 0 1\nT: 0 0 0\n")
    return seq, calib


def main():
    # Analytical WGS84 axis cases and ENU sign/boundary checks, no outcome data.
    assert adapter.ecef(0, 0, 0) == [6378137.0, 0.0, 0.0]
    assert abs(adapter.ecef(90, 0, 0)[2] - 6356752.314245179) < 1e-6
    east = adapter.enu([0, 1e-5, 0], [0, 0, 0])
    north = adapter.enu([1e-5, 0, 0], [0, 0, 0])
    assert 1.11 < east[0] < 1.12 and abs(east[1]) < 1e-9
    assert 1.10 < north[1] < 1.11 and abs(north[0]) < 1e-9
    seam = adapter.enu([0, -179.99999, 0], [0, 179.99999, 0])
    assert 2.22 < seam[0] < 2.23  # antimeridian, not a globe-spanning jump
    adapter.validate_rotation([0, -1, 0, 1, 0, 0, 0, 0, 1])
    for invalid in ([2, 0, 0, 0, 1, 0, 0, 0, 1], [-1, 0, 0, 0, 1, 0, 0, 0, 1]):
        try:
            adapter.validate_rotation(invalid)
        except ValueError:
            pass
        else:
            raise AssertionError("non-rigid/reflected calibration accepted")
    assert adapter.timestamp_ns("2011-09-26 13:02:45.000000001") % 1_000_000_000 == 1
    assert max(abs(v) for v in adapter.enu([49.0, 8.0, 100.0], [49.0, 8.0, 100.0])) == 0
    up = adapter.enu([49.0, 8.0, 101.0], [49.0, 8.0, 100.0])
    assert abs(up[2] - 1) < 1e-8 and max(abs(v) for v in up[:2]) < 1e-8
    with tempfile.TemporaryDirectory() as temp:
        seq, calib = fixture(Path(temp))
        outputs = adapter.adapt(seq, calib, 2)
        rows = [json.loads(line) for line in outputs[1].read_text().splitlines()]
        assert 1.10 < rows[1]["position_enu_m"][1] < 1.12
        assert rows[0]["skew_ns"] == 0
        try:
            adapter.adapt(seq, calib)
        except ValueError:
            pass
        else:
            raise AssertionError("existing output replaced")
    for fault in (
        "skew",
        "nonmonotonic",
        "missing_pose",
        "bad_calibration",
        "nonrigid_calibration",
        "nonfinite_pose",
    ):
        with tempfile.TemporaryDirectory() as temp:
            seq, calib = fixture(Path(temp))
            if fault == "skew":
                p = seq / "oxts/timestamps.txt"
                p.write_text(p.read_text().replace("45.000000001", "44.900000001"))
            elif fault == "nonmonotonic":
                p = seq / "image_02/timestamps.txt"
                p.write_text(p.read_text().replace("45.100000001", "45.000000001"))
            elif fault == "missing_pose":
                (seq / "oxts/data/0000000001.txt").unlink()
            elif fault == "bad_calibration":
                (calib / "calib_imu_to_velo.txt").write_text("R: 1\nT: 0 0 0\n")
            elif fault == "nonrigid_calibration":
                (calib / "calib_imu_to_velo.txt").write_text(
                    "R: 2 0 0 0 1 0 0 0 1\nT: 0 0 0\n"
                )
            else:
                p = seq / "oxts/data/0000000000.txt"
                p.write_text(p.read_text().replace("49.0", "nan"))
            try:
                adapter.adapt(seq, calib, 2)
            except (ValueError, FileNotFoundError):
                assert not (seq / "asl-manifest.tsv").exists()
            else:
                raise AssertionError(f"undetected fault: {fault}")
    print(
        json.dumps(
            {
                "synthetic_only": True,
                "WGS84_ENU": "passed",
                "nanosecond_precision": "passed",
                "faults": 6,
            }
        )
    )
    # Mutate a source immediately after the bounded read: parsed metadata and
    # its provenance must still describe exactly the same consumed snapshot.
    for target in ("camera", "pose_time", "pose", "calibration"):
        with tempfile.TemporaryDirectory() as temp:
            seq, calib = fixture(Path(temp))
            chosen = {
                "camera": seq / "image_02/timestamps.txt",
                "pose_time": seq / "oxts/timestamps.txt",
                "pose": seq / "oxts/data/0000000000.txt",
                "calibration": calib / "calib_imu_to_velo.txt",
            }[target]
            original = chosen.read_bytes()
            read = adapter.snapshot

            def mutate_after_read(path, limit, read=read, chosen=chosen):
                data = read(path, limit)
                if Path(path) == chosen:
                    chosen.write_bytes(b"mutated after read")
                return data

            adapter.snapshot = mutate_after_read
            try:
                _, spatial, provenance = adapter.adapt(seq, calib, 2)
            finally:
                adapter.snapshot = read
            proof = json.loads(provenance.read_text())
            expected = hashlib.sha256(original).hexdigest()
            if target == "camera":
                assert proof["camera_timestamps_sha256"] == expected
            elif target == "pose_time":
                assert proof["oxts_timestamps_sha256"] == expected
            elif target == "calibration":
                assert proof["calibration_sha256"][chosen.name] == expected
            else:
                row = json.loads(spatial.read_text().splitlines()[0])
                assert (
                    row["oxts_sha256"] == expected
                    and row["geodetic_lat_lon_alt"][0] == 49
                )
    print("metadata read/parse/hash snapshot identity passed for four source types")
    # Prefix selection must not hide an invalid complete source inventory.
    for stream, suffix in (("image_02", ".png"), ("oxts", ".txt")):
        for fault in ("extra", "missing_unselected", "malformed", "directory"):
            with tempfile.TemporaryDirectory() as temp:
                seq, calib = fixture(Path(temp))
                directory = seq / stream / "data"
                if fault == "extra":
                    (directory / f"0000000002{suffix}").write_bytes(b"extra")
                elif fault == "missing_unselected":
                    (directory / f"0000000001{suffix}").unlink()
                elif fault == "malformed":
                    (directory / f"1{suffix}").write_bytes(b"duplicate index")
                else:
                    (directory / f"0000000001{suffix}").unlink()
                    (directory / f"0000000001{suffix}").mkdir()
                try:
                    adapter.adapt(seq, calib, 1)
                except ValueError:
                    assert not (seq / "asl-manifest.tsv").exists()
                else:
                    raise AssertionError(f"undetected inventory fault: {stream}/{fault}")
    with tempfile.TemporaryDirectory() as temp:
        seq, calib = fixture(Path(temp))
        _, _, provenance = adapter.adapt(seq, calib, 1)
        proof = json.loads(provenance.read_text())
        assert proof["source_frames"] == 2 and proof["frames"] == 1
    print("complete camera/OXTS inventory validated before prefix selection")


if __name__ == "__main__":
    main()

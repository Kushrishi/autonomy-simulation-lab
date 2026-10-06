"""Synthetic KITTI-shaped metadata only. No dataset acquisition or raw data."""

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
                "faults": 5,
            }
        )
    )


if __name__ == "__main__":
    main()

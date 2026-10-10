# Acquiring a KITTI recording

No account is created and no data is downloaded by these tools. Register and
acquire through the [official raw-data page](https://www.cvlibs.net/datasets/kitti/raw_data.php).

Validated example sequence: **KITTI Raw, synced/rectified,
2011_09_26_drive_0001_sync** with its 2011_09_26 calibration package.
Download the synced sequence and matching calibration; the official archive may
contain extra streams. The adapter needs only:

- `image_02/data/*.png` and `image_02/timestamps.txt` (left color, rectified);
- `oxts/data/*.txt` and `oxts/timestamps.txt`;
- `calib_cam_to_cam.txt`, `calib_imu_to_velo.txt`, `calib_velo_to_cam.txt`.

Use the complete short sequence when available, subject to adapter's 1,000-frame
selection limit. Declare the selected frame count before evaluation; don't
select a photogenic frame subset. Images, OXTS and timestamps must share the
same sequence. Do not use unsynced/unrectified files as index-aligned inputs.

Record original downloaded archive names, byte sizes and SHA-256, acquisition
date, source page, accepted terms and sequence ID locally. Preserve extracted
source files. The adapter records selected input/calibration hashes, timestamps
and configuration; no expected archive checksum is fabricated in advance.
Raw archives, images, OXTS, calibration, result-derived images and `.rrd`
recordings containing them remain local and outside Git/review ZIPs.

Official [dataset copyright](https://www.cvlibs.net/datasets/kitti/index.php)
identifies CC BY-NC-SA 3.0: attribution, noncommercial use, and share-alike for
redistributed derivatives. Cite Geiger et al., *Vision meets Robotics: The KITTI
Dataset*, IJRR 2013. Read the current [site terms](https://www.cvlibs.net/datasets/kitti/terms_of_service.php)
and registration conditions yourself; don't assume commercial or employer use.
This project does not redistribute KITTI data. No mirror bypass is supported.

After legal acquisition, use the existing adapter as documented in
[spatial adapter instructions](SPATIAL_ADAPTERS.md). [The 7 October validation record](REAL_SEQUENCE_VALIDATION_2026_10.md) documents
complete real-sequence replay, MobileNet repeats and RRD export/reopen. Interactive
viewer inspection remains open; import/export has one warm-cache timing observation. No sensor fusion is
claimed. See [native release acceptance](RELEASE_READINESS_2026_10.md) for current requirements.

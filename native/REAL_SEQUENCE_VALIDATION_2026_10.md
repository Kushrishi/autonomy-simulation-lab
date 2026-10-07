# Authorized KITTI sequence validation — 7 October 2026

The complete official synced/rectified **2011_09_26_drive_0001_sync** recording passed import, image decode and repeated MobileNet replay on the tested Linux host. This is systems evidence, not KITTI accuracy, driving perception quality, attitude estimation, sensor fusion or a localization algorithm evaluation. No dataset payloads or KITTI-containing RRDs are redistributed.

## Identity and selection

Acquired through the authenticated official [KITTI Raw page](https://www.cvlibs.net/datasets/kitti/raw_data.php), not a mirror. The original archive bytes remain local. Independent noncommercial research; KITTI attribution and its published CC BY-NC-SA 3.0 context apply. Cite Geiger et al., *Vision meets Robotics: The KITTI Dataset*, IJRR 2013; see [acquisition and terms](ACQUISITION.md).

| Official archive | Bytes | SHA-256 |
| --- | ---: | --- |
| 2011_09_26_drive_0001_sync.zip | 458,643,963 | 7827a821ddc0a973bdf66de3a005a8825bd37c304aa9750f3c018f80d5b18458 |
| 2011_09_26_calib.zip | 4,068 | e0108cfd000cf802c14ed94fba38601185c792e5640abba015a34b7a85b812e0 |
| devkit_raw_data.zip | 172,067 | 5fe511ba02b9588c4b18ad154e6d31d716e16b6ad115d1ac00d13d6d5bbcb6bc |

Before evaluation, the local selection record declared every synchronized image_02/OXTS index up to the adapter's 1,000-frame bound, with no selected subset. The archive contains **108** synced frames, IDs 0000000000–0000000107; camera/OXTS counts and inventories agree. All images decoded as RGB8, 1242 × 375. All source image hashes matched the manifest. Full viewer export was allowed only below its 256 MiB aggregate encoded-image bound: these frames total 94,854,360 bytes. Additional archive streams were not imported.

Timestamps were parsed with nanosecond precision, strictly increased, and covered 11.036830976 seconds. Camera/OXTS correspondence follows the official devkit's synchronized index/closest-OXTS convention, not a claim that their acquisition times are identical. Observed OXTS minus image_02 skew ranged from 1,380,276 to 13,492,954 ns, below the predeclared 50 ms bound. The naive source clock is represented as UTC for arithmetic without claiming absolute UTC accuracy.

## Spatial boundary

All three calibration files parsed and their rotation matrices passed the existing proper-rigid-transform checks. The official devkit describes IMU → Velodyne, Velodyne → unrectified camera 0, then rectification/projection to camera 2; parsing these transforms does not transform the reported trajectory into camera coordinates. Rectified image_02 is the left color camera.

The trajectory uses WGS84 geodetic → ECEF → ENU at the first OXTS position. The first ENU point is exactly zero. An independent pyproj 3.8.0 EPSG:4979 → EPSG:4978 conversion plus explicit ENU rotation matched all 108 positions to the precision observed on this host (maximum absolute difference 0 m). This verifies the implemented conversion, not GNSS truth. OXTS roll/pitch/yaw are retained separately; no attitude estimation is claimed. The devkit's Mercator/initial-pose-normalized example is a different convention and is not used as an interchangeable ENU ground truth.

## Replay, faults and performance

Source implementation for the initial run: main 85da883 plus the inventory change now merged in PR16 (`bcc0072689ad10996135fd6342ac916276896158`). C++ Release build: GNU 13.3.0, libpng 1.6.43, zlib 1.3; Linux 6.18.44 x86_64 / glibc 2.39; Python 3.12.14. Native core remains independent of Rerun. Pinned MobileNet artifact, ONNX Runtime 1.30.0 CPU, sequential execution, one intra/inter thread, graph optimization disabled, and `asl-imagenet-center-v1` are as specified in [INFERENCE.md](INFERENCE.md).

Three complete 108-frame runs produced exactly equal output vectors and identities (latencies excluded). General comparison tolerance was declared at atol=rtol=1e-6 before real evaluation; the repeat audit used both zero. No cross-machine bitwise claim follows.

| Whole-command observation | Range across three runs |
| --- | ---: |
| Wall time | 5.800–5.925 s |
| Throughput | 18.23–18.62 frames/s |
| Decode p50 | 15.865–15.895 ms |
| Preprocess p50 | 7.183–7.299 ms |
| Inference p50 | 17.562–18.220 ms |
| Total per-frame p50 | 46.647–46.725 ms |
| Peak child RSS | 82,584 KiB |

Per-frame total excludes model/session startup and JSON serialization; whole-command wall includes initialization, validation and serialization. RSS is the harness child-process high-water observation. These are host/workload measurements, not universal throughput or clean-OS installation evidence.

Controlled faults used immutable base recording identity and local outputs:

- Dropped frame: valid reduced recording; comparison preserved the missing ID and recording-identity change. Duplicate/reordered frames: strict timestamp validation rejected them.
- Corrupt bytes/wrong hash: native verification rejected them before inference.
- Camera timestamp perturbation: comparison detected timestamp/recording identity differences.
- Missing calibration, non-rigid calibration, missing pose and excessive OXTS timing change: adapter rejected before output publication.
- ENU east bias and spatial OXTS skew: changed spatial evidence only. Missing pose: viewer exact coverage rejected. These did not rerun or change image inference.
- Actual RGB/BGR exchange on every frame and an actual preprocessing-contract change: MobileNet executed on the changed input/contract and numerical outputs changed on all 108 frames. Neither experiment estimates accuracy.
- Numeric/model-identity/preprocessing-identity result-record faults: comparison detected them; inconsistent shape was rejected. These are record perturbations, not evidence of executing a changed model artifact.

One first RGB/BGR fixture became truncated after its recorded hash; the runner rejected the mismatch and preserved its partial result. The cause of the local truncation is unresolved. A separately named fixture generated from encoded byte snapshots, checked against declared hashes before execution, completed. The failed artifact was not overwritten or relabeled as a successful run.

## Viewer and remaining boundaries

Rerun 0.38.1 exported all 108 verified image snapshots with frame/elapsed timestamps, ENU points, timing skew, top-index text and inference/total latency channels. Its CLI verified the RRD; a local loopback catalog server reopened it, and the frame-index table had 108 rows with all expected channels. KITTI-containing recordings remain local.

**Interactive visual usefulness is not yet inspected.** This environment has no native viewer-control surface; an uninspected export/reopen is not interactive QA. A separate warm-cache observation measured adapter execution at 0.130 s and RRD export/flush at 1.121 s; these exclude archive download/extraction and process startup. The native runner also refused an existing real output and preserved its bytes. Fresh OS/independent reproduction and cross-host inference are also not established.

All eleven Release CTests and all eleven ASan/UBSan CTests passed locally (LeakSanitizer disabled because unavailable in Work); synthetic fixtures remain the CI contract. PR16 Linux/macOS native and browser CI passed. Real KITTI data is not a CI dependency.

Follow [USABILITY.md](USABILITY.md), then the adapter command in [SPATIAL_ADAPTERS.md](SPATIAL_ADAPTERS.md) with `--limit 1000` to include the full short sequence. Use the pinned MobileNet contract, compare repeated records, and export with the optional Rerun adapter. Outputs refuse clobbering. Keep archives, source files, generated result payloads and RRDs outside public review artifacts.

No native release/tag, rename or additional perception workload is authorized by this evidence. Complete local viewer QA and durable data handoff before calling the real-data milestone fully closed or considering the next workload decision.

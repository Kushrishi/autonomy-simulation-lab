#include "asl/frame_files.hpp"
#include "asl/png_decode.hpp"
#include "asl/replay_manifest.hpp"
#ifdef ASL_HAS_ORT
#include "asl/inference.hpp"
#endif

#include <cstdint>
#include <iostream>
#include <stdexcept>
#include <string>

namespace {

std::uint64_t parse_positive(const char* value, const char* name) {
    try {
        std::size_t parsed = 0;
        const auto result = std::stoull(value, &parsed, 10);
        if (parsed != std::string(value).size() || result == 0U) {
            throw std::invalid_argument("invalid");
        }
        return result;
    } catch (const std::exception&) {
        throw std::invalid_argument(std::string(name) + " must be a positive integer");
    }
}

void usage() {
    std::cerr
        << "usage:\n"
        << "  asl-replay validate-manifest MANIFEST.tsv [MAX_RECORDS]\n"
        << "  asl-replay verify-files MANIFEST.tsv [MAX_RECORDS] [MAX_FILE_BYTES]\n"
        << "  asl-replay decode-png IMAGE.png [MAX_PIXELS]\n";
#ifdef ASL_HAS_ORT
    std::cerr << "  asl-replay run MANIFEST.tsv --model MODEL.onnx --model-sha SHA256 --out RESULTS.jsonl [--preprocessing CONTRACT]\n";
#endif
}

}  // namespace

int main(int argc, char** argv) {
    if (argc < 3) {
        usage();
        return 2;
    }

    const std::string command = argv[1];

    try {
#ifdef ASL_HAS_ORT
        if (command == "run" && (argc == 9 || argc == 11) && std::string(argv[3]) == "--model" &&
            std::string(argv[5]) == "--model-sha" && std::string(argv[7]) == "--out") {
            if(argc==11 && std::string(argv[9])!="--preprocessing")throw std::invalid_argument("expected --preprocessing");
            asl::replay::run_inference(argv[2], argv[4], argv[6], argv[8],
                                      argc==11 ? argv[10] : "asl-rgb-bilinear-v1");
            return 0;
        }
#endif
        if (command == "validate-manifest" && argc <= 4) {
            const auto max_records =
                argc == 4 ? static_cast<std::size_t>(parse_positive(argv[3], "MAX_RECORDS"))
                          : static_cast<std::size_t>(1000000);
            const auto records = asl::replay::load_manifest(argv[2], max_records);
            std::cout << "manifest valid\n";
            std::cout << "frames: " << records.size() << "\n";
            std::cout << "first_timestamp_ns: " << records.front().timestamp_ns << "\n";
            std::cout << "last_timestamp_ns: " << records.back().timestamp_ns << "\n";
            return 0;
        }

        if (command == "verify-files" && argc <= 5) {
            const auto max_records =
                argc >= 4 ? static_cast<std::size_t>(parse_positive(argv[3], "MAX_RECORDS"))
                          : static_cast<std::size_t>(1000000);
            const auto max_file_bytes =
                argc == 5 ? parse_positive(argv[4], "MAX_FILE_BYTES")
                          : static_cast<std::uint64_t>(536870912);

            const auto frames =
                asl::replay::verify_manifest_files(argv[2], max_records, max_file_bytes);
            std::uint64_t total_bytes = 0;
            for (const auto& frame : frames) {
                total_bytes += frame.bytes;
            }
            std::cout << "frame files valid\n";
            std::cout << "frames: " << frames.size() << "\n";
            std::cout << "total_bytes: " << total_bytes << "\n";
            return 0;
        }

        if (command == "decode-png" && argc <= 4) {
            const auto max_pixels =
                argc == 4 ? parse_positive(argv[3], "MAX_PIXELS")
                          : static_cast<std::uint64_t>(100000000);
            const auto image = asl::replay::decode_png_rgb8(argv[2], max_pixels);
            std::cout << "PNG valid\n";
            std::cout << "width: " << image.width << "\n";
            std::cout << "height: " << image.height << "\n";
            std::cout << "rgb_bytes: " << image.pixels.size() << "\n";
            return 0;
        }

        usage();
        return 2;
    } catch (const std::exception& error) {
        std::cerr << command << " failed: " << error.what() << "\n";
        return 1;
    }
}

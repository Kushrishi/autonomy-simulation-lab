#include "asl/frame_files.hpp"
#include "asl/sha256.hpp"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>

namespace {

constexpr const char* kAbcSha256 =
    "ba7816bf8f01cfea414140de5dae2223"
    "b00361a396177a9cb410ff61f20015ad";

void require(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

void write_text(const std::filesystem::path& path, const std::string& value) {
    std::ofstream output(path, std::ios::binary);
    if (!output) {
        throw std::runtime_error("unable to create test file");
    }
    output.write(value.data(), static_cast<std::streamsize>(value.size()));
}

void require_verify_failure(
    const std::filesystem::path& manifest_path,
    const std::string& expected,
    std::uint64_t max_file_bytes = 1024
) {
    try {
        static_cast<void>(
            asl::replay::verify_manifest_files(manifest_path, 100, max_file_bytes)
        );
    } catch (const std::exception& error) {
        require(
            std::string(error.what()).find(expected) != std::string::npos,
            "unexpected verification error: " + std::string(error.what())
        );
        return;
    }
    throw std::runtime_error("expected file verification to fail");
}

}  // namespace

int main() {
    const auto root =
        std::filesystem::temp_directory_path() / "asl-replay-file-identity-tests";

    try {
        std::filesystem::remove_all(root);
        std::filesystem::create_directories(root / "frames");
        write_text(root / "frames/abc.txt", "abc");

        const auto digest = asl::replay::sha256_file(root / "frames/abc.txt", 1024);
        require(digest.bytes == 3, "unexpected byte count");
        require(digest.sha256 == kAbcSha256, "SHA-256 implementation disagrees with known vector");

        const auto manifest_path = root / "manifest.tsv";
        write_text(
            manifest_path,
            std::string("frame_id\ttimestamp_ns\tpath\tsha256\n") +
                "frame-0001\t100\tframes/abc.txt\t" + kAbcSha256 + "\n"
        );

        const auto verified = asl::replay::verify_manifest_files(manifest_path, 10, 1024);
        require(verified.size() == 1, "expected one verified frame");
        require(verified.front().bytes == 3, "unexpected verified byte count");

        write_text(
            manifest_path,
            "frame_id\ttimestamp_ns\tpath\tsha256\n"
            "frame-0001\t100\tframes/abc.txt\t"
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
        );
        require_verify_failure(manifest_path, "SHA-256 mismatch");

        write_text(
            manifest_path,
            std::string("frame_id\ttimestamp_ns\tpath\tsha256\n") +
                "frame-0001\t100\t../outside.txt\t" + kAbcSha256 + "\n"
        );
        require_verify_failure(manifest_path, "relative path contained");

        write_text(
            manifest_path,
            std::string("frame_id\ttimestamp_ns\tpath\tsha256\n") +
                "frame-0001\t100\tframes/abc.txt\t" + kAbcSha256 + "\n"
        );
        require_verify_failure(manifest_path, "byte limit", 2);

        std::filesystem::remove_all(root);
        std::cout << "frame file identity tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::filesystem::remove_all(root);
        std::cerr << error.what() << "\n";
        return 1;
    }
}

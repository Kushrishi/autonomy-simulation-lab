#include "asl/png_decode.hpp"
#include "asl/sha256.hpp"

#include <png.h>

#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

void require(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

void write_png(const std::filesystem::path& path) {
    png_image image{};
    image.version = PNG_IMAGE_VERSION;
    image.width = 2;
    image.height = 2;
    image.format = PNG_FORMAT_RGB;

    const std::vector<unsigned char> pixels = {
        255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255,
    };

    if (png_image_write_to_file(&image, path.string().c_str(), 0, pixels.data(), 0, nullptr) == 0) {
        throw std::runtime_error("unable to create PNG fixture");
    }
}

void require_failure(const std::filesystem::path& path, std::uint64_t max_pixels,
                     const std::string& expected) {
    try {
        static_cast<void>(asl::replay::decode_png_rgb8(path, max_pixels));
    } catch (const std::exception& error) {
        require(std::string(error.what()).find(expected) != std::string::npos,
                "unexpected PNG error: " + std::string(error.what()));
        return;
    }
    throw std::runtime_error("expected PNG decoding to fail");
}

} // namespace

int main() {
    const auto root = std::filesystem::temp_directory_path() / "asl-replay-png-tests";

    try {
        std::filesystem::remove_all(root);
        std::filesystem::create_directories(root);

        const auto png_path = root / "fixture.png";
        write_png(png_path);

        const auto decoded = asl::replay::decode_png_rgb8(png_path, 4);
        require(decoded.width == 2U, "unexpected PNG width");
        require(decoded.height == 2U, "unexpected PNG height");
        require(decoded.pixels.size() == 12U, "unexpected RGB byte count");
        require(decoded.pixels[0] == 255U && decoded.pixels[1] == 0U, "red pixel changed");
        require(decoded.pixels[3] == 0U && decoded.pixels[4] == 255U, "green pixel changed");
        require(decoded.pixels[6] == 0U && decoded.pixels[8] == 255U, "blue pixel changed");

        require_failure(png_path, 3, "pixel limit");
        const auto snapshot = asl::replay::read_file_snapshot(png_path, 1024);
        std::ofstream(png_path, std::ios::binary) << "changed after verified read";
        const auto from_bytes = asl::replay::decode_png_rgb8_bytes(snapshot.bytes, 4);
        require(from_bytes.pixels == decoded.pixels,
                "byte-snapshot decode reopened the changed path");
        bool bounded = false;
        try {
            static_cast<void>(asl::replay::decode_png_rgb8_bytes(snapshot.bytes, 3));
        } catch (const std::runtime_error&) {
            bounded = true;
        }
        require(bounded, "memory PNG pixel limit not enforced");

        const auto invalid_path = root / "not-png.bin";
        std::ofstream(invalid_path, std::ios::binary) << "not a png";
        require_failure(invalid_path, 100, "unable to read PNG header");

        std::filesystem::remove_all(root);
        std::cout << "PNG decoding tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::filesystem::remove_all(root);
        std::cerr << error.what() << "\n";
        return 1;
    }
}

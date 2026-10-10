#pragma once

#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <vector>

namespace asl::replay {

struct RgbImage {
    std::uint32_t width;
    std::uint32_t height;
    std::vector<std::uint8_t> pixels;
};

RgbImage decode_png_rgb8(const std::filesystem::path& path, std::uint64_t max_pixels = 100000000);

RgbImage decode_png_rgb8_bytes(const std::vector<unsigned char>& bytes,
                               std::uint64_t max_pixels = 100000000);

} // namespace asl::replay

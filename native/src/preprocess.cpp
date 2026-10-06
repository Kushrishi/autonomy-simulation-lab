#include "asl/preprocess.hpp"
#include <algorithm>
#include <cmath>
#include <limits>
#include <stdexcept>

namespace asl::replay {
std::vector<float> preprocess_rgb(const RgbImage& image,
                                 std::uint32_t width, std::uint32_t height) {
    constexpr std::uint64_t pixel_limit = 1000000;
    const auto input_pixels = std::uint64_t(image.width) * image.height;
    const auto output_pixels = std::uint64_t(width) * height;
    if (!image.width || !image.height || !width || !height ||
        output_pixels > pixel_limit ||
        input_pixels > std::numeric_limits<std::size_t>::max() / 3 ||
        image.pixels.size() != input_pixels * 3) {
        throw std::invalid_argument("invalid RGB8 shape or bounded output shape");
    }
    constexpr double mean[] = {0.485, 0.456, 0.406};
    constexpr double stddev[] = {0.229, 0.224, 0.225};
    std::vector<float> out(static_cast<std::size_t>(output_pixels * 3));
    for (std::uint32_t y = 0; y < height; ++y) {
        const double sy = std::clamp((y + 0.5) * image.height / height - 0.5,
                                     0.0, double(image.height - 1));
        const auto y0 = static_cast<std::uint32_t>(std::floor(sy));
        const auto y1 = std::min(y0 + 1, image.height - 1);
        const double wy = sy - y0;
        for (std::uint32_t x = 0; x < width; ++x) {
            const double sx = std::clamp((x + 0.5) * image.width / width - 0.5,
                                         0.0, double(image.width - 1));
            const auto x0 = static_cast<std::uint32_t>(std::floor(sx));
            const auto x1 = std::min(x0 + 1, image.width - 1);
            const double wx = sx - x0;
            for (std::uint32_t c = 0; c < 3; ++c) {
                const auto pixel = [&](std::uint32_t ix, std::uint32_t iy) {
                    return double(image.pixels[(std::size_t(iy) * image.width + ix) * 3 + c]);
                };
                const double top = pixel(x0, y0) * (1 - wx) + pixel(x1, y0) * wx;
                const double bottom = pixel(x0, y1) * (1 - wx) + pixel(x1, y1) * wx;
                const double value = (top * (1 - wy) + bottom * wy) / 255.0;
                out[std::size_t(c) * output_pixels + std::size_t(y) * width + x] =
                    static_cast<float>((value - mean[c]) / stddev[c]);
            }
        }
    }
    return out;
}
}

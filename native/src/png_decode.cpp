#include "asl/png_decode.hpp"

#include <png.h>

#include <limits>
#include <stdexcept>
#include <string>
#include <utility>

namespace asl::replay {

namespace {
RgbImage finish_rgb(png_image& image, const std::string& filename, std::uint64_t max_pixels) {
    const auto fail = [&image, &filename](const std::string& reason) -> RgbImage {
        const std::string detail = image.message;
        png_image_free(&image);
        throw std::runtime_error(reason + ": " + filename + (detail.empty() ? "" : ": " + detail));
    };

    if (image.width == 0U || image.height == 0U) {
        return fail("PNG dimensions must be positive");
    }

    const auto width = static_cast<std::uint64_t>(image.width);
    const auto height = static_cast<std::uint64_t>(image.height);
    if (width > max_pixels / height) {
        return fail("PNG exceeds configured pixel limit");
    }
    const auto pixels_count = width * height;

    image.format = PNG_FORMAT_RGB;
    const auto output_bytes = static_cast<std::uint64_t>(PNG_IMAGE_SIZE(image));
    if (output_bytes != pixels_count * 3U) {
        return fail("unexpected RGB output size");
    }
    if (output_bytes > static_cast<std::uint64_t>(std::numeric_limits<std::size_t>::max())) {
        return fail("PNG output does not fit in memory address space");
    }

    std::vector<std::uint8_t> pixels(static_cast<std::size_t>(output_bytes));
    if (png_image_finish_read(&image, nullptr, pixels.data(), 0, nullptr) == 0) {
        return fail("unable to decode PNG");
    }
    png_image_free(&image);

    return RgbImage{
        static_cast<std::uint32_t>(width),
        static_cast<std::uint32_t>(height),
        std::move(pixels),
    };
}

} // namespace

RgbImage decode_png_rgb8(const std::filesystem::path& path, std::uint64_t max_pixels) {
    if (max_pixels == 0U)
        throw std::invalid_argument("max_pixels must be greater than zero");
    png_image image{};
    image.version = PNG_IMAGE_VERSION;
    const auto filename = path.string();
    if (png_image_begin_read_from_file(&image, filename.c_str()) == 0) {
        const std::string detail = image.message;
        png_image_free(&image);
        throw std::runtime_error("unable to read PNG header: " + filename + ": " + detail);
    }
    return finish_rgb(image, filename, max_pixels);
}

RgbImage decode_png_rgb8_bytes(const std::vector<unsigned char>& bytes, std::uint64_t max_pixels) {
    if (max_pixels == 0U)
        throw std::invalid_argument("max_pixels must be greater than zero");
    png_image image{};
    image.version = PNG_IMAGE_VERSION;
    if (bytes.empty() ||
        png_image_begin_read_from_memory(&image, bytes.data(), bytes.size()) == 0) {
        const std::string detail = image.message;
        png_image_free(&image);
        throw std::runtime_error("unable to read in-memory PNG header: " + detail);
    }
    return finish_rgb(image, "verified byte snapshot", max_pixels);
}

} // namespace asl::replay

#pragma once

#include "asl/png_decode.hpp"
#include <vector>

namespace asl::replay {
// asl-rgb-bilinear-v1: direct resize, half-pixel centers, edge clamp,
// double intermediate arithmetic, ImageNet normalization, float32 NCHW.
std::vector<float> preprocess_rgb(const RgbImage& image, std::uint32_t width = 224,
                                  std::uint32_t height = 224);
// Independently tested Pillow-compatible RGB8 resize -> center crop contract.
std::vector<float> preprocess_imagenet_center(const RgbImage& image);
}

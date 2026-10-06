#include "asl/preprocess.hpp"
#include <cmath>
#include <iostream>
#include <stdexcept>

int main() {
    using namespace asl::replay;
    const RgbImage pixel{1, 1, {0, 127, 255}};
    const auto output = preprocess_rgb(pixel, 2, 3);
    const double expected[] = {(0.0 - .485) / .229,
                              (127.0 / 255.0 - .456) / .224,
                              (1.0 - .406) / .225};
    if (output.size() != 18) return 1;
    for (std::size_t c = 0; c < 3; ++c)
        for (std::size_t i = 0; i < 6; ++i)
            if (std::abs(output[c * 6 + i] - expected[c]) > 1e-6) return 1;
    // An independently calculable center sample catches coordinate/axis errors.
    const RgbImage corners{2, 2, {0,0,0, 100,0,0, 200,0,0, 255,0,0}};
    const auto resized = preprocess_rgb(corners, 3, 3);
    const double center = ((0.0 + 100.0 + 200.0 + 255.0) / 4 / 255 - .485) / .229;
    if (std::abs(resized[4] - center) > 1e-6) return 1;
    unsigned rejected = 0;
    const auto rejects = [&](const RgbImage& image, unsigned w, unsigned h) {
        try { (void)preprocess_rgb(image, w, h); }
        catch (const std::invalid_argument&) { ++rejected; }
    };
    rejects(RgbImage{1,1,{0,0}}, 1, 1);
    rejects(RgbImage{0,1,{}}, 1, 1);
    rejects(pixel, 0, 1);
    rejects(pixel, 1001, 1000);
    rejects(RgbImage{0xffffffffu,0xffffffffu,{}}, 1, 1);
    if (rejected != 5) return 1;
    std::cout << "Analytic RGB/layout/bilinear checks and 5 API rejection cases passed\n";
}

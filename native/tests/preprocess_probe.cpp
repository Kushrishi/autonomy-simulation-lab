#include "asl/preprocess.hpp"
#include <iomanip>
#include <iostream>
#include <stdexcept>

// Text fixture transport only; not the replay CLI or a binary tensor format.
int main(int argc, char**) {
    try {
        unsigned w, h, ow, oh;
        if (!(std::cin >> w >> h >> ow >> oh) || !w || !h || std::uint64_t(w) * h > 1000000)
            return 2;
        asl::replay::RgbImage image{w, h, {}};
        for (std::uint64_t i = 0; i < std::uint64_t(w) * h * 3; ++i) {
            int value;
            if (!(std::cin >> value) || value < 0 || value > 255)
                return 2;
            image.pixels.push_back(static_cast<std::uint8_t>(value));
        }
        const auto tensor = argc == 2 ? asl::replay::preprocess_imagenet_center(image)
                                      : asl::replay::preprocess_rgb(image, ow, oh);
        std::cout << std::setprecision(9);
        for (const auto value : tensor)
            std::cout << value << '\n';
    } catch (const std::exception&) {
        return 2;
    }
}

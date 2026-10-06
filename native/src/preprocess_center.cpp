#include "asl/preprocess.hpp"
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace asl::replay {
namespace {
struct Kernel { std::size_t start; std::vector<int> coefficients; };
std::vector<Kernel> kernels(std::uint32_t in, std::uint32_t out) {
    constexpr double precision = 4194304.0; // Pillow RGB8 22-bit coefficients
    const double scale = double(in)/out, filter_scale = std::max(scale,1.0);
    std::vector<Kernel> result;
    for(std::uint32_t x=0;x<out;++x) {
        const double center=(x+.5)*scale;
        const auto start=std::max(0,int(center-filter_scale+.5));
        const auto end=std::min(int(in),int(center+filter_scale+.5));
        std::vector<double> weights; double sum=0;
        for(int i=start;i<end;++i) { const double w=std::max(0.0,1-std::abs((i-center+.5)/filter_scale));weights.push_back(w);sum+=w; }
        Kernel k{std::size_t(start),{}};
        for(double w:weights)k.coefficients.push_back(int(w/sum*precision+.5));
        result.push_back(std::move(k));
    }
    return result;
}
RgbImage resize(const RgbImage& source,std::uint32_t width,std::uint32_t height) {
    const auto horizontal=kernels(source.width,width), vertical=kernels(source.height,height);
    RgbImage intermediate{width,source.height,std::vector<std::uint8_t>(std::size_t(width)*source.height*3)};
    for(std::uint32_t y=0;y<source.height;++y)for(std::uint32_t x=0;x<width;++x)for(std::uint32_t c=0;c<3;++c) {
        std::int64_t sum=1<<21; const auto& k=horizontal[x];
        for(std::size_t i=0;i<k.coefficients.size();++i)sum+=std::int64_t(source.pixels[(std::size_t(y)*source.width+k.start+i)*3+c])*k.coefficients[i];
        intermediate.pixels[(std::size_t(y)*width+x)*3+c]=std::uint8_t(std::clamp<std::int64_t>(sum>>22,0,255));
    }
    RgbImage result{width,height,std::vector<std::uint8_t>(std::size_t(width)*height*3)};
    for(std::uint32_t y=0;y<height;++y)for(std::uint32_t x=0;x<width;++x)for(std::uint32_t c=0;c<3;++c) {
        std::int64_t sum=1<<21; const auto& k=vertical[y];
        for(std::size_t i=0;i<k.coefficients.size();++i)sum+=std::int64_t(intermediate.pixels[((k.start+i)*width+x)*3+c])*k.coefficients[i];
        result.pixels[(std::size_t(y)*width+x)*3+c]=std::uint8_t(std::clamp<std::int64_t>(sum>>22,0,255));
    }
    return result;
}
}
std::vector<float> preprocess_imagenet_center(const RgbImage& image) {
    if(!image.width || !image.height || image.pixels.size()!=std::uint64_t(image.width)*image.height*3)
        throw std::invalid_argument("invalid RGB8 input");
    const double ratio=256.0/std::min(image.width,image.height);
    const double rw=std::nearbyint(ratio*image.width), rh=std::nearbyint(ratio*image.height);
    if(rw*rh>1000000 || rw*image.height>1000000)throw std::invalid_argument("bounded center-resize allocation exceeded");
    const auto width=std::uint32_t(rw), height=std::uint32_t(rh);
    auto resized=resize(image,width,height);
    RgbImage crop{224,224,std::vector<std::uint8_t>(224*224*3)};
    const auto left=width/2-112, top=height/2-112;
    for(std::size_t y=0;y<224;++y)for(std::size_t x=0;x<224;++x)for(std::size_t c=0;c<3;++c)
        crop.pixels[(y*224+x)*3+c]=resized.pixels[((y+top)*width+x+left)*3+c];
    return preprocess_rgb(crop); // identity resize; preserved v1 normalization
}
}

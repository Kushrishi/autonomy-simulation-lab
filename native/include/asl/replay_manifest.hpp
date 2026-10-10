#pragma once

#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <istream>
#include <string>
#include <vector>

namespace asl::replay {

struct FrameRecord {
    std::string frame_id;
    std::uint64_t timestamp_ns;
    std::filesystem::path path;
    std::string sha256;
};

std::vector<FrameRecord> parse_manifest(std::istream& input, std::size_t max_records = 1000000);

std::vector<FrameRecord> load_manifest(const std::filesystem::path& path,
                                       std::size_t max_records = 1000000);

} // namespace asl::replay

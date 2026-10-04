#pragma once

#include "asl/replay_manifest.hpp"

#include <cstddef>
#include <cstdint>
#include <filesystem>
#include <vector>

namespace asl::replay {

struct VerifiedFrame {
    FrameRecord record;
    std::filesystem::path resolved_path;
    std::uint64_t bytes;
};

std::vector<VerifiedFrame> verify_manifest_files(
    const std::filesystem::path& manifest_path,
    std::size_t max_records = 1000000,
    std::uint64_t max_file_bytes = 536870912
);

}  // namespace asl::replay

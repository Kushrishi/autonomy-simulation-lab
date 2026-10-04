#pragma once

#include <cstdint>
#include <filesystem>
#include <string>

namespace asl::replay {

struct FileDigest {
    std::uint64_t bytes;
    std::string sha256;
};

FileDigest sha256_file(const std::filesystem::path& path, std::uint64_t max_bytes);

}  // namespace asl::replay

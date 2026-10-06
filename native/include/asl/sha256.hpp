#pragma once

#include <cstdint>
#include <filesystem>
#include <string>
#include <vector>

namespace asl::replay {

struct FileDigest {
    std::uint64_t bytes;
    std::string sha256;
};

FileDigest sha256_file(const std::filesystem::path& path, std::uint64_t max_bytes);

struct FileSnapshot {
    std::vector<unsigned char> bytes;
    std::string sha256;
};

// Digest and consumers share these exact bounded bytes, without reopening a path.
FileSnapshot read_file_snapshot(const std::filesystem::path& path, std::uint64_t max_bytes);

}  // namespace asl::replay

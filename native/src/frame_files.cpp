#include "asl/frame_files.hpp"

#include "asl/sha256.hpp"

#include <stdexcept>
#include <string>

namespace asl::replay {
namespace {

bool has_parent_reference(const std::filesystem::path& path) {
    for (const auto& component : path) {
        if (component == "..") {
            return true;
        }
    }
    return false;
}

bool is_within(const std::filesystem::path& base, const std::filesystem::path& candidate) {
    auto base_it = base.begin();
    auto candidate_it = candidate.begin();
    while (base_it != base.end()) {
        if (candidate_it == candidate.end() || *base_it != *candidate_it) {
            return false;
        }
        ++base_it;
        ++candidate_it;
    }
    return true;
}

std::filesystem::path resolve_frame_path(
    const std::filesystem::path& manifest_path,
    const std::filesystem::path& relative_path
) {
    if (relative_path.empty() || relative_path.is_absolute() || relative_path.has_root_name() ||
        relative_path.has_root_directory() || has_parent_reference(relative_path)) {
        throw std::runtime_error(
            "frame path must be a relative path contained by the manifest directory: " +
            relative_path.string()
        );
    }

    const auto base = std::filesystem::weakly_canonical(manifest_path.parent_path());
    const auto candidate = std::filesystem::weakly_canonical(base / relative_path);

    if (!is_within(base, candidate)) {
        throw std::runtime_error(
            "frame path resolves outside the manifest directory: " + relative_path.string()
        );
    }
    if (!std::filesystem::is_regular_file(candidate)) {
        throw std::runtime_error("frame path is not a regular file: " + relative_path.string());
    }
    return candidate;
}

}  // namespace

std::vector<VerifiedFrame> verify_manifest_files(
    const std::filesystem::path& manifest_path,
    std::size_t max_records,
    std::uint64_t max_file_bytes
) {
    const auto records = load_manifest(manifest_path, max_records);
    return verify_frame_records(manifest_path, records, max_file_bytes);
}

std::vector<VerifiedFrame> verify_frame_records(
    const std::filesystem::path& manifest_path,
    const std::vector<FrameRecord>& records,
    std::uint64_t max_file_bytes
) {
    std::vector<VerifiedFrame> verified;
    verified.reserve(records.size());

    for (const auto& record : records) {
        const auto resolved = resolve_frame_path(manifest_path, record.path);
        const auto digest = sha256_file(resolved, max_file_bytes);
        if (digest.sha256 != record.sha256) {
            throw std::runtime_error(
                "SHA-256 mismatch for frame " + record.frame_id + ": " + record.path.string()
            );
        }
        verified.push_back(VerifiedFrame{record, resolved, digest.bytes});
    }

    return verified;
}

}  // namespace asl::replay

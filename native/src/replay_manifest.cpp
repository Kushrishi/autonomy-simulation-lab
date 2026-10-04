#include "asl/replay_manifest.hpp"

#include <array>
#include <cctype>
#include <fstream>
#include <stdexcept>
#include <string_view>
#include <unordered_set>
#include <utility>

namespace asl::replay {
namespace {

constexpr std::string_view kHeader = "frame_id\ttimestamp_ns\tpath\tsha256";

std::array<std::string, 4> split_row(const std::string& line, std::size_t line_number) {
    std::array<std::string, 4> fields;
    std::size_t start = 0;

    for (std::size_t field = 0; field < fields.size(); ++field) {
        const auto end = line.find('\t', start);
        if (field + 1 == fields.size()) {
            if (end != std::string::npos) {
                throw std::runtime_error(
                    "line " + std::to_string(line_number) + ": expected exactly four tab-separated fields"
                );
            }
            fields[field] = line.substr(start);
            break;
        }
        if (end == std::string::npos) {
            throw std::runtime_error(
                "line " + std::to_string(line_number) + ": expected exactly four tab-separated fields"
            );
        }
        fields[field] = line.substr(start, end - start);
        start = end + 1;
    }

    return fields;
}

bool is_lower_hex_sha256(const std::string& value) {
    if (value.size() != 64) {
        return false;
    }
    for (const unsigned char character : value) {
        if (!std::isdigit(character) && !(character >= 'a' && character <= 'f')) {
            return false;
        }
    }
    return true;
}

std::uint64_t parse_timestamp(const std::string& value, std::size_t line_number) {
    if (value.empty()) {
        throw std::runtime_error("line " + std::to_string(line_number) + ": empty timestamp");
    }

    std::size_t parsed = 0;
    std::uint64_t timestamp = 0;
    try {
        timestamp = std::stoull(value, &parsed, 10);
    } catch (const std::exception&) {
        throw std::runtime_error(
            "line " + std::to_string(line_number) + ": timestamp_ns is not an unsigned integer"
        );
    }

    if (parsed != value.size()) {
        throw std::runtime_error(
            "line " + std::to_string(line_number) + ": timestamp_ns is not an unsigned integer"
        );
    }
    return timestamp;
}

}  // namespace

std::vector<FrameRecord> parse_manifest(std::istream& input, std::size_t max_records) {
    if (max_records == 0) {
        throw std::invalid_argument("max_records must be greater than zero");
    }

    std::string line;
    if (!std::getline(input, line)) {
        throw std::runtime_error("manifest is empty");
    }
    if (!line.empty() && line.back() == '\r') {
        line.pop_back();
    }
    if (line != kHeader) {
        throw std::runtime_error("manifest header must be: " + std::string(kHeader));
    }

    std::vector<FrameRecord> records;
    std::unordered_set<std::string> seen_ids;
    std::uint64_t previous_timestamp = 0;
    bool have_previous_timestamp = false;
    std::size_t line_number = 1;

    while (std::getline(input, line)) {
        ++line_number;
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }
        if (line.empty()) {
            throw std::runtime_error("line " + std::to_string(line_number) + ": blank rows are not allowed");
        }
        if (records.size() >= max_records) {
            throw std::runtime_error("manifest exceeds configured record limit");
        }

        auto fields = split_row(line, line_number);
        if (fields[0].empty()) {
            throw std::runtime_error("line " + std::to_string(line_number) + ": frame_id is empty");
        }
        if (fields[2].empty()) {
            throw std::runtime_error("line " + std::to_string(line_number) + ": path is empty");
        }
        if (!is_lower_hex_sha256(fields[3])) {
            throw std::runtime_error(
                "line " + std::to_string(line_number) + ": sha256 must be 64 lowercase hexadecimal characters"
            );
        }

        const auto timestamp = parse_timestamp(fields[1], line_number);
        if (have_previous_timestamp && timestamp <= previous_timestamp) {
            throw std::runtime_error(
                "line " + std::to_string(line_number) + ": timestamps must be strictly increasing"
            );
        }
        if (!seen_ids.insert(fields[0]).second) {
            throw std::runtime_error(
                "line " + std::to_string(line_number) + ": duplicate frame_id: " + fields[0]
            );
        }

        records.push_back(
            FrameRecord{
                std::move(fields[0]),
                timestamp,
                std::filesystem::path(std::move(fields[2])),
                std::move(fields[3]),
            }
        );
        previous_timestamp = timestamp;
        have_previous_timestamp = true;
    }

    if (records.empty()) {
        throw std::runtime_error("manifest contains no frame records");
    }

    return records;
}

std::vector<FrameRecord> load_manifest(const std::filesystem::path& path, std::size_t max_records) {
    std::ifstream input(path);
    if (!input) {
        throw std::runtime_error("unable to open manifest: " + path.string());
    }
    return parse_manifest(input, max_records);
}

}  // namespace asl::replay

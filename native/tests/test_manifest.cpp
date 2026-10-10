#include "asl/replay_manifest.hpp"

#include <functional>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>

namespace {

const std::string kHashA(64, 'a');
const std::string kHashB(64, 'b');

std::string manifest(const std::string& first_id = "frame-0001",
                     const std::string& second_id = "frame-0002",
                     const std::string& first_timestamp = "100",
                     const std::string& second_timestamp = "200",
                     const std::string& second_hash = kHashB) {
    return "frame_id\ttimestamp_ns\tpath\tsha256\n" + first_id + "\t" + first_timestamp +
           "\tframes/0001.png\t" + kHashA + "\n" + second_id + "\t" + second_timestamp +
           "\tframes/0002.png\t" + second_hash + "\n";
}

void require(bool condition, const std::string& message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

void require_failure(const std::string& input, const std::string& expected) {
    std::istringstream stream(input);
    try {
        static_cast<void>(asl::replay::parse_manifest(stream));
    } catch (const std::exception& error) {
        require(std::string(error.what()).find(expected) != std::string::npos,
                "unexpected error: " + std::string(error.what()));
        return;
    }
    throw std::runtime_error("expected manifest parsing to fail");
}

} // namespace

int main() {
    try {
        {
            std::istringstream stream(manifest());
            const auto records = asl::replay::parse_manifest(stream);
            require(records.size() == 2, "expected two records");
            require(records[0].frame_id == "frame-0001", "unexpected first frame ID");
            require(records[1].timestamp_ns == 200, "unexpected second timestamp");
            require(records[0].path.string() == "frames/0001.png", "unexpected frame path");
            require(records[1].sha256 == kHashB, "unexpected hash");
        }

        require_failure(manifest("frame-0001", "frame-0001"), "duplicate frame_id");
        require_failure(manifest("frame-0001", "frame-0002", "200", "100"), "strictly increasing");
        require_failure(manifest("frame-0001", "frame-0002", "abc", "200"), "unsigned integer");
        require_failure(manifest("frame-0001", "frame-0002", "100", "200", "ABC"), "sha256");

        {
            std::istringstream stream(manifest());
            try {
                static_cast<void>(asl::replay::parse_manifest(stream, 1));
                throw std::runtime_error("expected record limit failure");
            } catch (const std::exception& error) {
                require(std::string(error.what()).find("record limit") != std::string::npos,
                        "unexpected record-limit error");
            }
        }

        std::cout << "manifest contract tests passed\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << error.what() << "\n";
        return 1;
    }
}

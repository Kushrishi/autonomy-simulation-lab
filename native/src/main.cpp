#include "asl/replay_manifest.hpp"

#include <cstdlib>
#include <iostream>
#include <stdexcept>
#include <string>

int main(int argc, char** argv) {
    if (argc < 3 || std::string(argv[1]) != "validate-manifest" || argc > 4) {
        std::cerr << "usage: asl-replay validate-manifest MANIFEST.tsv [MAX_RECORDS]\n";
        return 2;
    }

    std::size_t max_records = 1000000;
    if (argc == 4) {
        try {
            const auto parsed = std::stoull(argv[3]);
            if (parsed == 0) {
                throw std::invalid_argument("zero");
            }
            max_records = static_cast<std::size_t>(parsed);
        } catch (const std::exception&) {
            std::cerr << "MAX_RECORDS must be a positive integer\n";
            return 2;
        }
    }

    try {
        const auto records = asl::replay::load_manifest(argv[2], max_records);
        std::cout << "manifest valid\n";
        std::cout << "frames: " << records.size() << "\n";
        std::cout << "first_timestamp_ns: " << records.front().timestamp_ns << "\n";
        std::cout << "last_timestamp_ns: " << records.back().timestamp_ns << "\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "manifest invalid: " << error.what() << "\n";
        return 1;
    }
}

#include "asl/output_lock.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>

namespace fs = std::filesystem;
void require(bool condition, const char* message) {
    if (!condition)
        throw std::runtime_error(message);
}
int main(int argc, char** argv) {
    if (argc != 2)
        return 2;
    const fs::path root(argv[1]);
    fs::create_directories(root);
    const auto output = root / "result.jsonl";
    const auto lock = root / "result.jsonl.lock";
    try {
        {
            asl::replay::OutputLock owner(output);
            require(fs::is_directory(lock), "lock not acquired");
            bool refused = false;
            try {
                asl::replay::OutputLock competitor(output);
            } catch (const std::runtime_error&) {
                refused = true;
            }
            require(refused, "second writer acquired existing lock");
            owner.release();
            require(!fs::exists(lock), "successful release left lock");
            owner.release();
        }
        {
            asl::replay::OutputLock owner(output);
            std::ofstream(lock / "diagnostic.txt") << "preserve evidence";
            bool refused = false;
            try {
                owner.release();
            } catch (const fs::filesystem_error&) {
                refused = true;
            }
            require(refused, "cleanup failure was hidden");
            require(fs::exists(lock / "diagnostic.txt"), "cleanup erased evidence");
        }
        require(fs::exists(lock / "diagnostic.txt"), "destructor erased evidence");
        fs::remove(lock / "diagnostic.txt");
        fs::remove(lock);
        try {
            asl::replay::OutputLock owner(output);
            throw std::runtime_error("injected execution failure");
        } catch (const std::runtime_error&) {
        }
        require(!fs::exists(lock), "failure path left empty owned lock");
        fs::remove(root);
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        return 1;
    }
}

#pragma once

#include <filesystem>
#include <stdexcept>

namespace asl::replay {
// Failure paths release best-effort; successful publication must call release().
class OutputLock {
public:
    explicit OutputLock(const std::filesystem::path& output) : path_(output) {
        path_ += ".lock";
        if (!std::filesystem::create_directory(path_))
            throw std::runtime_error("output writer lock already exists");
    }
    ~OutputLock() {
        if (owned_) {
            std::error_code error;
            std::filesystem::remove(path_, error);
        }
    }
    void release() {
        if (!owned_)
            return;
        std::filesystem::remove(path_);
        if (std::filesystem::exists(path_))
            throw std::runtime_error("output writer lock cleanup incomplete");
        owned_ = false;
    }
    OutputLock(const OutputLock&) = delete;
    OutputLock& operator=(const OutputLock&) = delete;

private:
    std::filesystem::path path_;
    bool owned_ = true;
};
}

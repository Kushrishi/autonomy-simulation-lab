#pragma once

#include <filesystem>
#include <string>

namespace asl::replay {
void run_inference(const std::filesystem::path& manifest, const std::filesystem::path& model,
                   const std::string& expected_model_sha, const std::filesystem::path& output,
                   const std::string& preprocessing = "asl-rgb-bilinear-v1",
                   const std::string& graph_optimization = "disabled");
}

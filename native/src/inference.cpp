#include "asl/inference.hpp"
#include "asl/output_lock.hpp"
#include "asl/frame_files.hpp"
#include "asl/png_decode.hpp"
#include "asl/preprocess.hpp"
#include "asl/sha256.hpp"
#include <onnxruntime_cxx_api.h>
#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <fstream>
#include <iomanip>
#include <numeric>
#include <sstream>
#include <stdexcept>

namespace asl::replay {
namespace {
using Clock = std::chrono::steady_clock;
double ms(Clock::time_point a, Clock::time_point b) {
    return std::chrono::duration<double, std::milli>(b - a).count();
}
std::string quote(const std::string& s) {
    std::ostringstream out;
    out << '"';
    for (unsigned char c : s) {
        if (c == '"' || c == '\\')
            out << '\\' << c;
        else if (c < 32)
            out << "\\u" << std::hex << std::setw(4) << std::setfill('0') << unsigned(c);
        else
            out << c;
    }
    out << '"';
    return out.str();
}
}

void run_inference(const std::filesystem::path& manifest, const std::filesystem::path& model,
                   const std::string& expected_model_sha, const std::filesystem::path& output,
                   const std::string& preprocessing) {
    if (preprocessing != "asl-rgb-bilinear-v1" && preprocessing != "asl-imagenet-center-v1")
        throw std::runtime_error("unknown preprocessing contract");
    if (std::filesystem::exists(output))
        throw std::runtime_error("output already exists; preserve earlier records");
    const auto model_snapshot = read_file_snapshot(model, 536870912);
    const auto& model_sha = model_snapshot.sha256;
    if (model_sha != expected_model_sha)
        throw std::runtime_error("model SHA-256 mismatch");
    const auto manifest_snapshot = read_file_snapshot(manifest, 16777216);
    const auto& recording_sha = manifest_snapshot.sha256;
    std::istringstream manifest_input(
        std::string(manifest_snapshot.bytes.begin(), manifest_snapshot.bytes.end()));
    const auto frames =
        verify_frame_records(manifest, parse_manifest(manifest_input, 10000), 536870912);
    Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "asl-replay");
    Ort::SessionOptions options;
    options.SetIntraOpNumThreads(1);
    options.SetInterOpNumThreads(1);
    options.SetExecutionMode(ExecutionMode::ORT_SEQUENTIAL);
    options.SetGraphOptimizationLevel(GraphOptimizationLevel::ORT_DISABLE_ALL);
    Ort::Session session(env, model_snapshot.bytes.data(), model_snapshot.bytes.size(), options);
    if (session.GetInputCount() != 1 || session.GetOutputCount() != 1)
        throw std::runtime_error("one input/output required by this workload boundary");
    auto input_type = session.GetInputTypeInfo(0);
    auto input_info = input_type.GetTensorTypeAndShapeInfo();
    const std::vector<int64_t> shape{1, 3, 224, 224};
    auto declared_shape = input_info.GetShape();
    if (declared_shape.size() == 4 && declared_shape[0] == -1)
        declared_shape[0] = 1;
    if (input_info.GetElementType() != ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT ||
        declared_shape != shape)
        throw std::runtime_error("model input must be float32 [1,3,224,224]");
    Ort::AllocatorWithDefaultOptions allocator;
    auto input_name = session.GetInputNameAllocated(0, allocator);
    auto output_name = session.GetOutputNameAllocated(0, allocator);
    const char* ins[]{input_name.get()};
    const char* outs[]{output_name.get()};
    const auto memory = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    // A partial file is intentionally preserved on failure, never published as complete.
    OutputLock writer_lock(output);
    if (std::filesystem::exists(output))
        throw std::runtime_error("output already exists");
    auto partial = output;
    partial += ".partial";
    if (std::filesystem::exists(partial))
        throw std::runtime_error("partial output already exists");
    std::ofstream stream(partial);
    stream.exceptions(std::ios::badbit | std::ios::failbit);
    stream << std::setprecision(9);
    std::size_t total_output_elements = 0;
    for (const auto& frame : frames) {
        const auto start = Clock::now();
        // Hash and decode the same immutable bounded bytes, not two path opens.
        const auto snapshot = read_file_snapshot(frame.resolved_path, 536870912);
        if (snapshot.sha256 != frame.record.sha256)
            throw std::runtime_error("frame identity changed after validation");
        const auto verified = Clock::now();
        auto image = decode_png_rgb8_bytes(snapshot.bytes, 100000000);
        const auto decoded = Clock::now();
        auto input = preprocessing == "asl-rgb-bilinear-v1" ? preprocess_rgb(image)
                                                            : preprocess_imagenet_center(image);
        const auto preprocessed = Clock::now();
        auto tensor = Ort::Value::CreateTensor<float>(memory, input.data(), input.size(),
                                                      shape.data(), shape.size());
        auto results = session.Run(Ort::RunOptions{nullptr}, ins, &tensor, 1, outs, 1);
        const auto inferred = Clock::now();
        if (!results[0].IsTensor())
            throw std::runtime_error("non-tensor output");
        auto info = results[0].GetTensorTypeAndShapeInfo();
        if (info.GetElementType() != ONNX_TENSOR_ELEMENT_DATA_TYPE_FLOAT)
            throw std::runtime_error("float32 output required");
        auto count = info.GetElementCount();
        if (count == 0 || count > 1000000)
            throw std::runtime_error("output element bound exceeded");
        total_output_elements += count;
        if (total_output_elements > 10000000)
            throw std::runtime_error("recording output element bound exceeded");
        const auto values = results[0].GetTensorData<float>();
        for (std::size_t i = 0; i < count; ++i)
            if (!std::isfinite(values[i]))
                throw std::runtime_error("nonfinite model output");
        stream
            << "{\"schema\":\"asl-replay-v1\",\"frame_id\":" << quote(frame.record.frame_id)
            << ",\"timestamp_ns\":" << frame.record.timestamp_ns
            << ",\"input_sha256\":" << quote(frame.record.sha256)
            << ",\"recording_sha256\":" << quote(recording_sha)
            << ",\"model_sha256\":" << quote(model_sha)
            << ",\"preprocessing\":" << quote(preprocessing)
            << ",\"runtime\":" << quote(OrtGetApiBase()->GetVersionString())
            << ",\"provider\":\"CPUExecutionProvider\",\"threads\":1,\"graph_optimization\":\"disabled\",\"dtype\":\"float32\",\"output_shape\":[";
        auto dims = info.GetShape();
        for (std::size_t i = 0; i < dims.size(); ++i) {
            if (i)
                stream << ',';
            stream << dims[i];
        }
        stream << "],\"output\":[";
        for (std::size_t i = 0; i < count; ++i) {
            if (i)
                stream << ',';
            stream << values[i];
        }
        // Indices only: no unsupported semantic class labels for arbitrary fixtures.
        std::vector<std::size_t> indices(count);
        std::iota(indices.begin(), indices.end(), 0);
        std::partial_sort(
            indices.begin(), indices.begin() + std::min<std::size_t>(5, count), indices.end(),
            [&](auto a, auto b) { return values[a] == values[b] ? a < b : values[a] > values[b]; });
        stream << "],\"top_indices\":[";
        for (std::size_t i = 0; i < std::min<std::size_t>(5, count); ++i) {
            if (i)
                stream << ',';
            stream << indices[i];
        }
        stream << "],\"latency_ms\":{\"verify\":" << ms(start, verified)
               << ",\"decode\":" << ms(verified, decoded)
               << ",\"preprocess\":" << ms(decoded, preprocessed)
               << ",\"inference\":" << ms(preprocessed, inferred)
               << ",\"total\":" << ms(start, inferred) << "}}\n";
        if (stream.tellp() > std::streamoff(134217728))
            throw std::runtime_error("128 MiB output file bound exceeded");
    }
    stream.close();
    // Atomic no-clobber publication on the same filesystem.
    std::filesystem::create_hard_link(partial, output);
    std::filesystem::remove(partial);
    if (std::filesystem::exists(partial))
        throw std::runtime_error("partial output cleanup incomplete");
    writer_lock.release();
}
}

cmake_minimum_required(VERSION 3.20)

project(asl_replay LANGUAGES CXX)

option(ASL_ENABLE_SANITIZERS "Enable AddressSanitizer and UndefinedBehaviorSanitizer" OFF)
set(ASL_ONNXRUNTIME_ROOT "" CACHE PATH "Pinned ONNX Runtime distribution; empty disables inference")

find_package(PNG REQUIRED)

add_library(asl_replay_core
    src/frame_files.cpp
    src/png_decode.cpp
    src/preprocess.cpp
    src/preprocess_center.cpp
    src/replay_manifest.cpp
    src/sha256.cpp
)
target_include_directories(asl_replay_core PUBLIC include)
target_compile_features(asl_replay_core PUBLIC cxx_std_17)
target_link_libraries(asl_replay_core PUBLIC PNG::PNG)

if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(asl_replay_core PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

if(ASL_ENABLE_SANITIZERS AND CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(asl_replay_core PUBLIC -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(asl_replay_core PUBLIC -fsanitize=address,undefined)
endif()

add_executable(asl-replay src/main.cpp)
target_link_libraries(asl-replay PRIVATE asl_replay_core)
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(asl-replay PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()
if(ASL_ONNXRUNTIME_ROOT)
    find_path(ORT_INCLUDE onnxruntime_cxx_api.h PATHS "${ASL_ONNXRUNTIME_ROOT}/include" NO_DEFAULT_PATH REQUIRED)
    find_library(ORT_LIBRARY onnxruntime PATHS "${ASL_ONNXRUNTIME_ROOT}/lib" NO_DEFAULT_PATH REQUIRED)
    target_sources(asl-replay PRIVATE src/inference.cpp)
    target_include_directories(asl-replay SYSTEM PRIVATE "${ORT_INCLUDE}")
    target_link_libraries(asl-replay PRIVATE "${ORT_LIBRARY}")
    target_compile_definitions(asl-replay PRIVATE ASL_HAS_ORT=1)
    # Installed runner keeps the explicitly configured external runtime location.
    set_target_properties(asl-replay PROPERTIES INSTALL_RPATH "${ASL_ONNXRUNTIME_ROOT}/lib")
endif()

enable_testing()

add_executable(asl_replay_manifest_tests tests/test_manifest.cpp)
target_link_libraries(asl_replay_manifest_tests PRIVATE asl_replay_core)
add_test(NAME manifest_contract COMMAND asl_replay_manifest_tests)

add_executable(asl_replay_file_tests tests/test_frame_files.cpp)
target_link_libraries(asl_replay_file_tests PRIVATE asl_replay_core)
add_test(NAME frame_file_identity COMMAND asl_replay_file_tests)

add_executable(asl_replay_png_tests tests/test_png_decode.cpp)
target_link_libraries(asl_replay_png_tests PRIVATE asl_replay_core)
add_test(NAME png_decode COMMAND asl_replay_png_tests)

find_package(Python3 REQUIRED COMPONENTS Interpreter)
add_executable(asl_preprocess_tests tests/test_preprocess.cpp)
target_link_libraries(asl_preprocess_tests PRIVATE asl_replay_core)
add_test(NAME preprocessing_contract COMMAND asl_preprocess_tests)
add_executable(asl_preprocess_probe tests/preprocess_probe.cpp)
target_link_libraries(asl_preprocess_probe PRIVATE asl_replay_core)
add_test(NAME preprocessing_parity COMMAND ${Python3_EXECUTABLE}
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/preprocess_reference.py $<TARGET_FILE:asl_preprocess_probe>)
if(ASL_ONNXRUNTIME_ROOT)
    add_test(NAME usability_workflow COMMAND ${Python3_EXECUTABLE}
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_usability.py $<TARGET_FILE:asl-replay>)
    add_test(NAME replay_inference COMMAND ${Python3_EXECUTABLE}
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_inference.py $<TARGET_FILE:asl-replay>)
    add_test(NAME model_preprocessing_parity COMMAND ${Python3_EXECUTABLE}
        ${CMAKE_CURRENT_SOURCE_DIR}/tests/preprocess_center_reference.py $<TARGET_FILE:asl_preprocess_probe>)
endif()
add_test(NAME spatial_adapter_contract COMMAND ${Python3_EXECUTABLE}
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_spatial_adapter.py)

install(TARGETS asl-replay RUNTIME DESTINATION bin)
add_test(NAME fault_tooling_contract COMMAND ${Python3_EXECUTABLE}
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_faults.py)
add_test(NAME viewer_snapshot_contract COMMAND ${Python3_EXECUTABLE}
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/test_viewer_boundary.py)

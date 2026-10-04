cmake_minimum_required(VERSION 3.20)

project(asl_replay LANGUAGES CXX)

option(ASL_ENABLE_SANITIZERS "Enable AddressSanitizer and UndefinedBehaviorSanitizer" OFF)

find_package(PNG REQUIRED)

add_library(asl_replay_core
    src/frame_files.cpp
    src/png_decode.cpp
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

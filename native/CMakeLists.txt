cmake_minimum_required(VERSION 3.20)

project(asl_replay LANGUAGES CXX)

option(ASL_ENABLE_SANITIZERS "Enable AddressSanitizer and UndefinedBehaviorSanitizer" OFF)

add_library(asl_replay_manifest
    src/replay_manifest.cpp
)
target_include_directories(asl_replay_manifest PUBLIC include)
target_compile_features(asl_replay_manifest PUBLIC cxx_std_17)

if(CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(asl_replay_manifest PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

if(ASL_ENABLE_SANITIZERS AND CMAKE_CXX_COMPILER_ID MATCHES "Clang|GNU")
    target_compile_options(asl_replay_manifest PUBLIC -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(asl_replay_manifest PUBLIC -fsanitize=address,undefined)
endif()

add_executable(asl-replay src/main.cpp)
target_link_libraries(asl-replay PRIVATE asl_replay_manifest)

enable_testing()
add_executable(asl_replay_manifest_tests tests/test_manifest.cpp)
target_link_libraries(asl_replay_manifest_tests PRIVATE asl_replay_manifest)
add_test(NAME manifest_contract COMMAND asl_replay_manifest_tests)

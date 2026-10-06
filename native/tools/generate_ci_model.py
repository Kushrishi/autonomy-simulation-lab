"""Reproduce the 204-byte infrastructure fixture, not a learned model.

Requires onnx==1.19.1. This project-generated artifact uses the repository MIT
license. It averages each normalized channel; no perception claim is made.
"""

from pathlib import Path

import onnx
from onnx import TensorProto, helper

model = helper.make_model(
    helper.make_graph(
        [
            helper.make_node(
                "ReduceMean", ["rgb"], ["channel_means"], axes=[2, 3], keepdims=0
            )
        ],
        "asl-generated-infrastructure-fixture",
        [helper.make_tensor_value_info("rgb", TensorProto.FLOAT, [1, 3, 224, 224])],
        [helper.make_tensor_value_info("channel_means", TensorProto.FLOAT, [1, 3])],
    ),
    opset_imports=[helper.make_opsetid("", 13)],
    producer_name="ASL fixture generator",
    ir_version=8,
)
onnx.checker.check_model(model)
Path(__file__).resolve().parents[1].joinpath(
    "tests/fixtures/channel_means.onnx"
).write_bytes(model.SerializeToString())

import contextlib
import io
from pathlib import Path
import unittest

from compare_planners import print_summary_table, summarize_payload


class TelemetrySummaryTests(unittest.TestCase):
    def test_no_measurements_are_not_perfect_localization(self):
        for samples in [[], [{"error": None}], [{}]]:
            with self.subTest(samples=samples):
                row = summarize_payload({"localizationSamples": samples}, Path("empty.json"))
                self.assertIsNone(row["average_error"])
                self.assertIsNone(row["rmse"])
                output = io.StringIO()
                with contextlib.redirect_stdout(output):
                    print_summary_table([row])
                self.assertIn("N/A", output.getvalue())

    def test_observed_zero_is_retained(self):
        row = summarize_payload({"localizationSamples": [{"error": 0}]}, Path("zero.json"))
        self.assertEqual(row["average_error"], 0)
        self.assertEqual(row["rmse"], 0)

    def test_missing_samples_do_not_bias_observed_errors(self):
        row = summarize_payload({"localizationSamples": [
            {"error": 3}, {"error": None}, {"error": 4}, {}
        ]}, Path("mixed.json"))
        self.assertEqual(row["average_error"], 3.5)
        self.assertAlmostEqual(row["rmse"], (12.5 ** 0.5))


if __name__ == "__main__":
    unittest.main()

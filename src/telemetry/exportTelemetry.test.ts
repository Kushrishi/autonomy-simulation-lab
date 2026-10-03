import { describe, expect, it } from "vitest";
import { buildPayload, convertSamplesToCsvRows } from "./exportTelemetry";
import { buildLocalizationSamples } from "../localization/localization";
import type { Scenario, SimulationMetrics } from "../simulation/types";

function fixture() {
  const scenario: Scenario = {
    name: 'North, "gate"\nroute', rows: 4, cols: 4,
    start: { row: 0, col: 0 }, goal: { row: 0, col: 1 }, obstacles: [],
  };
  const path = [scenario.start, scenario.goal];
  const metrics: SimulationMetrics = {
    algorithm: "A*", pathLength: 2, nodesVisited: 2, currentStep: 1,
    runtimeMs: 1, status: "complete",
  };
  return { scenario, algorithm: "A*" as const, metrics, path, visited: path,
    localizationSamples: buildLocalizationSamples(path, 0, 4, 4) };
}

describe("telemetry contract", () => {
  it("escapes commas, embedded quotes and newlines in CSV names", () => {
    const csv = convertSamplesToCsvRows(buildPayload(fixture()));
    expect(csv).toContain('"North, ""gate""\nroute","A*","0"');
  });

  it("retains recorded sample steps rather than replacing them with row numbers", () => {
    const input = fixture();
    input.localizationSamples[0].step = 7;
    expect(convertSamplesToCsvRows(buildPayload(input)))
      .toContain('route","A*","7"');
  });

  it("records explicit grid units and snapshots data without aliasing live state", () => {
    const input = fixture();
    const payload = buildPayload(input);
    input.scenario.start.row = 3;
    input.metrics.status = "failed";
    input.localizationSamples[0].rangeObservations[0].measuredRange = 99;
    expect(payload.schemaVersion).toBe(1);
    expect(payload.units).toEqual({ position: "grid-cell", time: "simulation-step" });
    expect(payload.scenarioSnapshot.start.row).toBe(0);
    expect(payload.metrics.status).toBe("complete");
    expect(payload.localizationSamples[0].rangeObservations[0].measuredRange).not.toBe(99);
  });
});

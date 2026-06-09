import { describe, expect, it } from "vitest";
import { parseImportedScenario } from "./scenarioImport";

describe("scenario import validation", () => {
  it("parses a valid imported scenario", () => {
    const scenario = parseImportedScenario({
      name: "Imported Test",
      rows: 5,
      cols: 6,
      start: { row: 0, col: 0 },
      goal: { row: 4, col: 5 },
      obstacles: [{ row: 2, col: 2 }],
      terrain: [
        { position: { row: 1, col: 1 }, type: "rough" },
        { position: { row: 1, col: 2 }, type: "slow" },
      ],
    });

    expect(scenario).not.toBeNull();
    expect(scenario?.name).toBe("Imported Test");
    expect(scenario?.rows).toBe(5);
    expect(scenario?.cols).toBe(6);
    expect(scenario?.start).toEqual({ row: 0, col: 0 });
    expect(scenario?.goal).toEqual({ row: 4, col: 5 });
    expect(scenario?.obstacles).toContainEqual({ row: 2, col: 2 });
    expect(scenario?.terrain).toContainEqual({
      position: { row: 1, col: 1 },
      type: "rough",
    });
  });

  it("uses a fallback name when the imported name is blank", () => {
    const scenario = parseImportedScenario({
      name: "   ",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 3, col: 3 },
      obstacles: [],
      terrain: [],
    });

    expect(scenario?.name).toBe("Imported Scenario");
  });

  it("rejects invalid grid sizes", () => {
    const scenario = parseImportedScenario({
      name: "Invalid Grid",
      rows: 1,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 0, col: 3 },
      obstacles: [],
      terrain: [],
    });

    expect(scenario).toBeNull();
  });

  it("rejects positions outside the grid", () => {
    const scenario = parseImportedScenario({
      name: "Invalid Position",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 9, col: 9 },
      obstacles: [],
      terrain: [],
    });

    expect(scenario).toBeNull();
  });

  it("rejects malformed obstacles", () => {
    const scenario = parseImportedScenario({
      name: "Bad Obstacles",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 3, col: 3 },
      obstacles: [{ row: 2, col: "bad" }],
      terrain: [],
    });

    expect(scenario).toBeNull();
  });

  it("rejects malformed terrain", () => {
    const scenario = parseImportedScenario({
      name: "Bad Terrain",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 3, col: 3 },
      obstacles: [],
      terrain: [{ position: { row: 1, col: 1 }, type: "mud" }],
    });

    expect(scenario).toBeNull();
  });

  it("removes imported obstacles that overlap the start or goal", () => {
    const scenario = parseImportedScenario({
      name: "Clean Obstacles",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 3, col: 3 },
      obstacles: [
        { row: 0, col: 0 },
        { row: 3, col: 3 },
        { row: 1, col: 1 },
      ],
      terrain: [],
    });

    expect(scenario?.obstacles).toEqual([{ row: 1, col: 1 }]);
  });

  it("removes terrain that overlaps start, goal, or obstacles", () => {
    const scenario = parseImportedScenario({
      name: "Clean Terrain",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 3, col: 3 },
      obstacles: [{ row: 1, col: 1 }],
      terrain: [
        { position: { row: 0, col: 0 }, type: "rough" },
        { position: { row: 3, col: 3 }, type: "slow" },
        { position: { row: 1, col: 1 }, type: "rough" },
        { position: { row: 2, col: 2 }, type: "slow" },
      ],
    });

    expect(scenario?.terrain).toEqual([
      { position: { row: 2, col: 2 }, type: "slow" },
    ]);
  });

  it("treats missing terrain as an empty terrain list", () => {
    const scenario = parseImportedScenario({
      name: "No Terrain",
      rows: 4,
      cols: 4,
      start: { row: 0, col: 0 },
      goal: { row: 3, col: 3 },
      obstacles: [],
    });

    expect(scenario?.terrain).toEqual([]);
  });
});
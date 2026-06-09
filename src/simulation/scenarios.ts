import type { Scenario } from "./types";

export const defaultScenario: Scenario = {
  name: "Warehouse Navigation Demo",
  rows: 12,
  cols: 16,
  start: { row: 1, col: 1 },
  goal: { row: 10, col: 14 },
  obstacles: [
    { row: 2, col: 3 },
    { row: 3, col: 3 },
    { row: 4, col: 3 },
    { row: 5, col: 3 },

    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
    { row: 6, col: 7 },

    { row: 8, col: 2 },
    { row: 8, col: 3 },
    { row: 8, col: 4 },
    { row: 8, col: 5 },

    { row: 7, col: 10 },
    { row: 8, col: 10 },
    { row: 9, col: 10 },

    { row: 4, col: 12 },
    { row: 4, col: 13 },
    { row: 4, col: 14 },
  ],
};
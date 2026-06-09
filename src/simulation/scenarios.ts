import type { Scenario } from "./types";

export const warehouseScenario: Scenario = {
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

export const mazeScenario: Scenario = {
  name: "Maze Navigation Demo",
  rows: 12,
  cols: 16,
  start: { row: 1, col: 1 },
  goal: { row: 10, col: 14 },
  obstacles: [
    { row: 1, col: 4 },
    { row: 2, col: 4 },
    { row: 3, col: 4 },
    { row: 4, col: 4 },
    { row: 5, col: 4 },
    { row: 6, col: 4 },
    { row: 8, col: 4 },
    { row: 9, col: 4 },
    { row: 10, col: 4 },

    { row: 1, col: 8 },
    { row: 2, col: 8 },
    { row: 4, col: 8 },
    { row: 5, col: 8 },
    { row: 6, col: 8 },
    { row: 7, col: 8 },
    { row: 8, col: 8 },
    { row: 10, col: 8 },

    { row: 2, col: 12 },
    { row: 3, col: 12 },
    { row: 4, col: 12 },
    { row: 5, col: 12 },
    { row: 7, col: 12 },
    { row: 8, col: 12 },
    { row: 9, col: 12 },
  ],
};

export const obstacleCourseScenario: Scenario = {
  name: "Obstacle Course Demo",
  rows: 12,
  cols: 16,
  start: { row: 0, col: 0 },
  goal: { row: 11, col: 15 },
  obstacles: [
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 1, col: 4 },

    { row: 3, col: 1 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
    { row: 3, col: 4 },
    { row: 3, col: 5 },

    { row: 5, col: 6 },
    { row: 5, col: 7 },
    { row: 5, col: 8 },
    { row: 5, col: 9 },
    { row: 5, col: 10 },

    { row: 7, col: 3 },
    { row: 8, col: 3 },
    { row: 9, col: 3 },

    { row: 8, col: 11 },
    { row: 9, col: 11 },
    { row: 10, col: 11 },

    { row: 2, col: 13 },
    { row: 3, col: 13 },
    { row: 4, col: 13 },
  ],
};

export const openFieldScenario: Scenario = {
  name: "Open Field Demo",
  rows: 12,
  cols: 16,
  start: { row: 2, col: 2 },
  goal: { row: 9, col: 13 },
  obstacles: [
    { row: 3, col: 5 },
    { row: 4, col: 5 },
    { row: 5, col: 5 },

    { row: 6, col: 8 },
    { row: 7, col: 8 },

    { row: 3, col: 10 },
    { row: 4, col: 10 },
    { row: 5, col: 10 },

    { row: 8, col: 4 },
    { row: 8, col: 5 },
    { row: 8, col: 6 },

    { row: 9, col: 10 },
    { row: 9, col: 11 },
  ],
};

export const scenarios: Scenario[] = [
  warehouseScenario,
  mazeScenario,
  obstacleCourseScenario,
  openFieldScenario,
];

export const defaultScenario = warehouseScenario;
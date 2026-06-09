import type { Scenario, TerrainCell } from "./types";

const warehouseTerrain: TerrainCell[] = [
  ...Array.from({ length: 8 }, (_, index) => ({
    position: { row: 9, col: index + 4 },
    type: "rough" as const,
  })),
  ...Array.from({ length: 5 }, (_, index) => ({
    position: { row: index + 4, col: 11 },
    type: "slow" as const,
  })),
];

const mazeTerrain: TerrainCell[] = [
  ...Array.from({ length: 7 }, (_, index) => ({
    position: { row: 6, col: index + 4 },
    type: "rough" as const,
  })),
  ...Array.from({ length: 6 }, (_, index) => ({
    position: { row: index + 7, col: 9 },
    type: "slow" as const,
  })),
];

const obstacleCourseTerrain: TerrainCell[] = [
  ...Array.from({ length: 9 }, (_, index) => ({
    position: { row: 5, col: index + 3 },
    type: "rough" as const,
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    position: { row: 10, col: index + 5 },
    type: "slow" as const,
  })),
];

const openFieldTerrain: TerrainCell[] = [
  // Direct route between start and goal is expensive.
  // BFS ignores this cost and tends to choose the shortest step-count path.
  // Dijkstra and A* should prefer going around the slow corridor.
  ...Array.from({ length: 12 }, (_, index) => ({
    position: { row: 8, col: index + 2 },
    type: "slow" as const,
  })),

  // Rough terrain creates secondary cost regions while still leaving cheaper
  // routes above and below the slow corridor.
  ...Array.from({ length: 5 }, (_, index) => ({
    position: { row: 6, col: index + 6 },
    type: "rough" as const,
  })),

  ...Array.from({ length: 5 }, (_, index) => ({
    position: { row: 10, col: index + 6 },
    type: "rough" as const,
  })),
];

export const scenarios: Scenario[] = [
  {
    name: "Warehouse Navigation Demo",
    rows: 16,
    cols: 16,
    start: { row: 1, col: 1 },
    goal: { row: 14, col: 14 },
    obstacles: [
      { row: 3, col: 4 },
      { row: 4, col: 4 },
      { row: 5, col: 4 },
      { row: 6, col: 4 },
      { row: 7, col: 4 },
      { row: 3, col: 8 },
      { row: 4, col: 8 },
      { row: 5, col: 8 },
      { row: 6, col: 8 },
      { row: 7, col: 8 },
      { row: 10, col: 6 },
      { row: 10, col: 7 },
      { row: 10, col: 8 },
      { row: 10, col: 9 },
      { row: 10, col: 10 },
      { row: 12, col: 12 },
      { row: 13, col: 12 },
    ],
    terrain: warehouseTerrain,
  },
  {
    name: "Maze Navigation Demo",
    rows: 16,
    cols: 16,
    start: { row: 1, col: 1 },
    goal: { row: 14, col: 13 },
    obstacles: [
      { row: 2, col: 3 },
      { row: 3, col: 3 },
      { row: 4, col: 3 },
      { row: 5, col: 3 },
      { row: 6, col: 3 },
      { row: 7, col: 3 },
      { row: 8, col: 3 },
      { row: 8, col: 4 },
      { row: 8, col: 5 },
      { row: 8, col: 6 },
      { row: 8, col: 7 },
      { row: 2, col: 7 },
      { row: 3, col: 7 },
      { row: 4, col: 7 },
      { row: 5, col: 7 },
      { row: 10, col: 9 },
      { row: 11, col: 9 },
      { row: 12, col: 9 },
      { row: 13, col: 9 },
      { row: 4, col: 11 },
      { row: 5, col: 11 },
      { row: 6, col: 11 },
      { row: 7, col: 11 },
    ],
    terrain: mazeTerrain,
  },
  {
    name: "Obstacle Course Demo",
    rows: 16,
    cols: 16,
    start: { row: 2, col: 2 },
    goal: { row: 13, col: 13 },
    obstacles: [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
      { row: 4, col: 6 },
      { row: 5, col: 10 },
      { row: 6, col: 10 },
      { row: 7, col: 10 },
      { row: 8, col: 6 },
      { row: 9, col: 6 },
      { row: 10, col: 6 },
      { row: 11, col: 10 },
      { row: 11, col: 11 },
      { row: 11, col: 12 },
    ],
    terrain: obstacleCourseTerrain,
  },
  {
    name: "Weighted Terrain Demo",
    rows: 16,
    cols: 16,
    start: { row: 8, col: 1 },
    goal: { row: 8, col: 14 },
    obstacles: [
      { row: 4, col: 5 },
      { row: 4, col: 6 },
      { row: 4, col: 7 },
      { row: 12, col: 8 },
      { row: 12, col: 9 },
      { row: 12, col: 10 },
    ],
    terrain: openFieldTerrain,
  },
];

export const defaultScenario = scenarios[0];
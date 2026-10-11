import { describe, expect, it } from "vitest";
import { runAstar } from "./astar";
import { runBfs } from "./bfs";
import { runDijkstra } from "./dijkstra";
import type { PlannerResult, Scenario } from "../simulation/types";
import { buildScenarioWithDynamicObstacle, createReplanningScenario } from "../simulation/dynamicObstacles";
const planners = [runBfs, runDijkstra, runAstar];

// Independent synchronous Bellman-Ford over a dense directed graph. No production
// neighbor, cost, queue or heuristic helper is reused.
function oracle(s: Scenario, weighted: boolean): number {
  const n = s.rows * s.cols;
  const id = (row: number, col: number) => row * s.cols + col;
  const blocked = new Set(s.obstacles.map(p => id(p.row, p.col)));
  const weights = Array(n).fill(1) as number[];
  if (weighted) for (const c of s.terrain ?? []) weights[id(c.position.row, c.position.col)] = c.type === "slow" ? 5 : c.type === "rough" ? 3 : 1;
  let d = Array(n).fill(Infinity) as number[];
  d[id(s.start.row, s.start.col)] = 0;
  for (let k = 0; k < n - 1; k++) {
    const next = d.slice();
    for (let u = 0; u < n; u++) {
      if (blocked.has(u)) continue;
      for (let v = 0; v < n; v++) {
        const delta = Math.abs(Math.floor(u / s.cols) - Math.floor(v / s.cols)) + Math.abs(u % s.cols - v % s.cols);
        if (delta === 1 && !blocked.has(v)) next[v] = Math.min(next[v], d[u] + weights[v]);
      }
    }
    d = next;
  }
  return d[id(s.goal.row, s.goal.col)];
}
function check(s: Scenario, r: PlannerResult, expected: number, weighted: boolean) {
  expect(r.success).toBe(Number.isFinite(expected));
  if (!r.success) { expect(r.path).toEqual([]); expect(r.pathCost).toBe(0); return; }
  expect(r.path[0]).toEqual(s.start); expect(r.path.at(-1)).toEqual(s.goal);
  let cost = 0;
  for (let i = 0; i < r.path.length; i++) {
    const p = r.path[i];
    expect(p.row >= 0 && p.row < s.rows && p.col >= 0 && p.col < s.cols).toBe(true);
    expect(s.obstacles.some(q => q.row === p.row && q.col === p.col)).toBe(false);
    if (!i) continue;
    const q = r.path[i - 1]; expect(Math.abs(q.row - p.row) + Math.abs(q.col - p.col)).toBe(1);
    const t = s.terrain?.find(c => c.position.row === p.row && c.position.col === p.col)?.type;
    cost += t === "slow" ? 5 : t === "rough" ? 3 : 1;
  }
  expect(r.pathCost).toBe(cost);
  expect(weighted ? r.pathCost : r.path.length - 1).toBe(expected);
}
describe("independent planner oracle", () => {
  it("exhausts 512 3x3 obstacle masks and all valid ordered endpoint pairs", () => {
    const cells = Array.from({ length: 9 }, (_, i) => ({ row: Math.floor(i / 3), col: i % 3 })); let cases = 0;
    for (let mask = 0; mask < 512; mask++) {
      const obstacles = cells.filter((_, i) => mask & (1 << i)); const free = cells.filter((_, i) => !(mask & (1 << i)));
      for (const start of free) for (const goal of free) {
        const s = { name: "exhaustive", rows: 3, cols: 3, start, goal, obstacles };
        const expected = oracle(s, false);
        for (const planner of planners) check(s, planner(s), expected, false);
        cases++;
      }
    }
    expect(cases).toBe(11520);
  }, 30000);
  it("exhausts 7680 weighted 2x3 scenarios and checks deterministic ties", () => {
    const cells = Array.from({ length: 6 }, (_, i) => ({ row: Math.floor(i / 3), col: i % 3 })); let cases = 0;
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
      if (a === b) continue;
      const other = cells.filter((_, i) => i !== a && i !== b);
      for (let encoding = 0; encoding < 256; encoding++) {
        const s: Scenario = { name: "weighted", rows: 2, cols: 3, start: cells[a], goal: cells[b], obstacles: [], terrain: [] }; let states = encoding;
        for (const position of other) {
          const state = states % 4; states = Math.floor(states / 4);
          if (state === 3) s.obstacles.push(position); else if (state) s.terrain!.push({ position, type: state === 1 ? "rough" : "slow" });
        }
        check(s, runBfs(s), oracle(s, false), false);
        const expected = oracle(s, true);
        for (const planner of [runDijkstra, runAstar]) { const r = planner(s); check(s, r, expected, true); expect(planner(s)).toEqual(r); }
        cases++;
      }
    }
    expect(cases).toBe(7680);
  }, 30000);
  it("rejects blocked and out-of-bounds endpoints including blocked start equal to goal", () => {
    const base: Scenario = { name: "invalid", rows: 2, cols: 2, start: { row: 0, col: 0 }, goal: { row: 1, col: 1 }, obstacles: [] };
    for (const s of [{ ...base, obstacles: [base.start] }, { ...base, start: { row: -1, col: 0 } }, { ...base, goal: { row: 2, col: 1 } }, { ...base, goal: base.start, obstacles: [base.start] }])
      for (const planner of planners) expect(planner(s)).toEqual({ path: [], visited: [], success: false, pathCost: 0 });
  });
  it("replans after obstacle and terrain edits, without charging the current start", () => {
    const base: Scenario = { name: "dynamic", rows: 3, cols: 4, start: { row: 1, col: 0 }, goal: { row: 1, col: 3 }, obstacles: [], terrain: [{ position: { row: 1, col: 1 }, type: "slow" }] };
    const s = createReplanningScenario(buildScenarioWithDynamicObstacle(base, { row: 1, col: 2 }), { row: 1, col: 1 });
    for (const planner of planners) check(s, planner(s), oracle(s, planner !== runBfs), planner !== runBfs);
    const changed = { ...s, terrain: [{ position: { row: 0, col: 2 }, type: "slow" as const }] };
    for (const planner of [runDijkstra, runAstar]) check(changed, planner(changed), oracle(changed, true), true);
    expect(base.obstacles).toEqual([]);
  });
});

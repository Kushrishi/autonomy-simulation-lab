import type { Position } from "../simulation/types";

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}
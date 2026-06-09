import type { Position, Scenario } from "../simulation/types";

type SimulatorGridProps = {
  scenario: Scenario;
  robotPosition: Position;
  path: Position[];
  visited: Position[];
};

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function containsPosition(list: Position[], position: Position): boolean {
  return list.some((item) => samePosition(item, position));
}

export default function SimulatorGrid({
  scenario,
  robotPosition,
  path,
  visited,
}: SimulatorGridProps) {
  const cells = [];

  for (let row = 0; row < scenario.rows; row++) {
    for (let col = 0; col < scenario.cols; col++) {
      const position = { row, col };

      let className = "grid-cell";
      let label = "";

      if (containsPosition(visited, position)) {
        className += " visited";
      }

      if (containsPosition(path, position)) {
        className += " path";
      }

      if (containsPosition(scenario.obstacles, position)) {
        className += " obstacle";
      }

      if (samePosition(position, scenario.start)) {
        className += " start";
        label = "S";
      }

      if (samePosition(position, scenario.goal)) {
        className += " goal";
        label = "G";
      }

      if (samePosition(position, robotPosition)) {
        className += " robot";
        label = "●";
      }

      cells.push(
        <div className={className} key={`${row}-${col}`}>
          {label}
        </div>
      );
    }
  }

  return (
    <div
      className="simulator-grid"
      style={{
        gridTemplateColumns: `repeat(${scenario.cols}, 1fr)`,
      }}
    >
      {cells}
    </div>
  );
}
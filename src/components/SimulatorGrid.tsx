import type { Position, Scenario, SensorReading } from "../simulation/types";

type SimulatorGridProps = {
  scenario: Scenario;
  robotPosition: Position;
  path: Position[];
  visited: Position[];
  sensorReadings: SensorReading[];
};

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function containsPosition(list: Position[], position: Position): boolean {
  return list.some((item) => samePosition(item, position));
}

function isSensorCell(
  sensorReadings: SensorReading[],
  position: Position
): boolean {
  return sensorReadings.some((reading) =>
    containsPosition(reading.cells, position)
  );
}

function isSensorHit(
  sensorReadings: SensorReading[],
  position: Position
): boolean {
  return sensorReadings.some(
    (reading) =>
      reading.obstaclePosition &&
      samePosition(reading.obstaclePosition, position)
  );
}

export default function SimulatorGrid({
  scenario,
  robotPosition,
  path,
  visited,
  sensorReadings,
}: SimulatorGridProps) {
  const cells = [];

  for (let row = 0; row < scenario.rows; row++) {
    for (let col = 0; col < scenario.cols; col++) {
      const position = { row, col };

      let className = "grid-cell";
      let label = "";

      if (isSensorCell(sensorReadings, position)) {
        className += " sensor";
      }

      if (isSensorHit(sensorReadings, position)) {
        className += " sensor-hit";
      }

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
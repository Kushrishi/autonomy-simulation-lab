import type {
  Position,
  Scenario,
  SensorDirection,
  SensorReading,
} from "../simulation/types";

const directionSteps: Record<SensorDirection, Position> = {
  Up: { row: -1, col: 0 },
  Down: { row: 1, col: 0 },
  Left: { row: 0, col: -1 },
  Right: { row: 0, col: 1 },
};

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function isInsideGrid(position: Position, scenario: Scenario): boolean {
  return (
    position.row >= 0 &&
    position.row < scenario.rows &&
    position.col >= 0 &&
    position.col < scenario.cols
  );
}

function isObstacle(position: Position, scenario: Scenario): boolean {
  return scenario.obstacles.some((obstacle) => samePosition(obstacle, position));
}

function scanDirection(
  scenario: Scenario,
  robotPosition: Position,
  direction: SensorDirection,
  maxRange: number
): SensorReading {
  const step = directionSteps[direction];
  const cells: Position[] = [];

  for (let distance = 1; distance <= maxRange; distance++) {
    const nextPosition: Position = {
      row: robotPosition.row + step.row * distance,
      col: robotPosition.col + step.col * distance,
    };

    if (!isInsideGrid(nextPosition, scenario)) {
      return {
        direction,
        distance: distance - 1,
        detectedObstacle: false,
        cells,
      };
    }

    cells.push(nextPosition);

    if (isObstacle(nextPosition, scenario)) {
      return {
        direction,
        distance,
        detectedObstacle: true,
        cells,
        obstaclePosition: nextPosition,
      };
    }
  }

  return {
    direction,
    distance: maxRange,
    detectedObstacle: false,
    cells,
  };
}

export function getRangeSensorReadings(
  scenario: Scenario,
  robotPosition: Position,
  maxRange = 5
): SensorReading[] {
  return [
    scanDirection(scenario, robotPosition, "Up", maxRange),
    scanDirection(scenario, robotPosition, "Down", maxRange),
    scanDirection(scenario, robotPosition, "Left", maxRange),
    scanDirection(scenario, robotPosition, "Right", maxRange),
  ];
}
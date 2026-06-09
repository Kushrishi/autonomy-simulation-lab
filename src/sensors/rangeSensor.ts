import type {
  Position,
  Scenario,
  SensorDirection,
  SensorReading,
} from "../simulation/types";

// Each sensor direction maps to a row/column step.
// For example, Up means row decreases by 1 each scan step.
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

// Scans outward from the robot in one direction until it reaches the sensor
// range limit, an obstacle, or the edge of the grid.
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
    // Stop scanning if the ray reaches the edge of the map.
    if (!isInsideGrid(nextPosition, scenario)) {
      return {
        direction,
        distance: distance - 1,
        detectedObstacle: false,
        cells,
      };
    }

    cells.push(nextPosition);
    // Stop scanning when the first obstacle is detected.
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
// Simulates four simple range sensors mounted on the robot.
// Each reading reports clear distance or the nearest obstacle in that direction.
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
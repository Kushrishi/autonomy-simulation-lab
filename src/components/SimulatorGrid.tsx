import { useId, useRef, useState } from "react";
import type {
  LocalizationSample,
  Position,
  Scenario,
  SensorReading,
} from "../simulation/types";
import { roundToGridCell } from "../localization/localization";
import { getTerrainType } from "../simulation/terrain";

type SimulatorGridProps = {
  scenario: Scenario;
  robotPosition: Position;
  path: Position[];
  visited: Position[];
  sensorReadings: SensorReading[];
  localizationSample?: LocalizationSample;
  onCellClick?: (position: Position) => void;
  editingDisabled?: boolean;
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

function isMeasuredPosition(
  localizationSample: LocalizationSample | undefined,
  position: Position
): boolean {
  if (!localizationSample) {
    return false;
  }

  return samePosition(
    roundToGridCell(localizationSample.measuredPosition),
    position
  );
}

function isEstimatedPosition(
  localizationSample: LocalizationSample | undefined,
  position: Position
): boolean {
  if (!localizationSample) {
    return false;
  }

  return samePosition(
    roundToGridCell(localizationSample.estimatedPosition),
    position
  );
}

export default function SimulatorGrid({
  scenario,
  robotPosition,
  path,
  visited,
  sensorReadings,
  localizationSample,
  onCellClick,
  editingDisabled = false,
}: SimulatorGridProps) {
  const instructionsId = useId();
  const [activeCell, setActiveCell] = useState(0);
  const cellRefs = useRef(new Map<number, HTMLButtonElement>());
  const focusIndex = Math.min(activeCell, scenario.rows * scenario.cols - 1);
  const cells = [];

  for (let row = 0; row < scenario.rows; row++) {
    for (let col = 0; col < scenario.cols; col++) {
      const position = { row, col };
      const terrainType = getTerrainType(scenario, position);

      let className = "grid-cell";
      let label = "";

      if (terrainType !== "normal") {
        className += ` terrain-${terrainType}`;
      }

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

      if (isMeasuredPosition(localizationSample, position)) {
        className += " measured-position";
        label = "M";
      }

      if (isEstimatedPosition(localizationSample, position)) {
        className += " estimated-position";
        label = "E";
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

      const index = row * scenario.cols + col;
      const description = `Row ${row + 1}, column ${col + 1}: ${className
        .replace("grid-cell", terrainType === "normal" ? "normal-terrain" : "")
        .trim().split(/\s+/).map((state) => state.replaceAll("-", " ")).join(", ")}`;

      cells.push(
        <button
          type="button"
          className={className}
          key={`${row}-${col}`}
          ref={(node) => {
            if (node) cellRefs.current.set(index, node);
            else cellRefs.current.delete(index);
          }}
          aria-label={description}
          aria-disabled={editingDisabled || !onCellClick}
          tabIndex={index === focusIndex ? 0 : -1}
          onFocus={() => setActiveCell(index)}
          onClick={() => {
            if (!editingDisabled) onCellClick?.(position);
          }}
          onKeyDown={(event) => {
            let next: number;
            switch (event.key) {
              case "ArrowRight": next = row * scenario.cols + Math.min(col + 1, scenario.cols - 1); break;
              case "ArrowLeft": next = row * scenario.cols + Math.max(col - 1, 0); break;
              case "ArrowDown": next = Math.min(row + 1, scenario.rows - 1) * scenario.cols + col; break;
              case "ArrowUp": next = Math.max(row - 1, 0) * scenario.cols + col; break;
              case "Home": next = event.ctrlKey ? 0 : row * scenario.cols; break;
              case "End": next = event.ctrlKey ? scenario.rows * scenario.cols - 1 : (row + 1) * scenario.cols - 1; break;
              default: return;
            }
            event.preventDefault();
            cellRefs.current.get(next)?.focus();
          }}
        >
          {label}
        </button>
      );
    }
  }

  return (
    <>
    <p className="panel-note" id={instructionsId}>Use arrow keys to move between cells and Enter or Space to apply the selected editor tool. Editing pauses while the simulation runs.</p>
    <div
      className="simulator-grid"
      role="group"
      aria-label="Scenario editor"
      aria-describedby={instructionsId}
      style={{
        gridTemplateColumns: `repeat(${scenario.cols}, 1fr)`,
      }}
    >
      {cells}
    </div>
    </>
  );
}

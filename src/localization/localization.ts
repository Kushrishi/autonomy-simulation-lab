import type {
  ContinuousPosition,
  LocalizationBeacon,
  LocalizationMetrics,
  LocalizationSample,
  Position,
  RangeObservation,
} from "../simulation/types";

function toContinuousPosition(position: Position): ContinuousPosition {
  return {
    row: position.row,
    col: position.col,
  };
}

function distance(a: ContinuousPosition, b: ContinuousPosition): number {
  const rowDifference = a.row - b.row;
  const colDifference = a.col - b.col;

  return Math.sqrt(rowDifference * rowDifference + colDifference * colDifference);
}

function generateDeterministicNoise(step: number, noiseLevel: number) {
  return {
    rowNoise: Math.sin(step * 1.7) * noiseLevel,
    colNoise: Math.cos(step * 1.3) * noiseLevel,
  };
}

function generateRangeNoise(
  step: number,
  beaconIndex: number,
  noiseLevel: number
): number {
  return (
    Math.sin(step * 1.19 + beaconIndex * 2.11) * noiseLevel * 0.7 +
    Math.cos(step * 0.73 + beaconIndex * 0.5) * noiseLevel * 0.35
  );
}

function smoothEstimate(
  previousEstimate: ContinuousPosition,
  measuredPosition: ContinuousPosition,
  alpha = 0.45
): ContinuousPosition {
  return {
    row:
      previousEstimate.row +
      alpha * (measuredPosition.row - previousEstimate.row),
    col:
      previousEstimate.col +
      alpha * (measuredPosition.col - previousEstimate.col),
  };
}

export function createDefaultBeacons(
  rows: number,
  cols: number
): LocalizationBeacon[] {
  const maxRow = Math.max(rows - 1, 1);
  const maxCol = Math.max(cols - 1, 1);

  return [
    { id: "B1", position: { row: 0, col: 0 } },
    { id: "B2", position: { row: 0, col: maxCol } },
    { id: "B3", position: { row: maxRow, col: 0 } },
    { id: "B4", position: { row: maxRow, col: maxCol } },
  ];
}

export function buildRangeObservations(
  truePosition: ContinuousPosition,
  beacons: LocalizationBeacon[],
  step: number,
  noiseLevel: number
): RangeObservation[] {
  return beacons.map((beacon, index) => {
    const trueRange = distance(truePosition, beacon.position);
    const measuredRange = Math.max(
      0.05,
      trueRange + generateRangeNoise(step, index, noiseLevel)
    );

    return {
      beaconId: beacon.id,
      beaconPosition: beacon.position,
      trueRange,
      measuredRange,
      residual: 0,
    };
  });
}

// Solves an unweighted nonlinear parametric least-squares range-positioning
// problem using Gauss-Newton iterations. Unknowns are row and col; observations
// are noisy ranges to fixed beacons.
export function estimatePositionFromRanges(
  observations: RangeObservation[],
  initialEstimate: ContinuousPosition,
  iterations = 8
): ContinuousPosition {
  let estimate = {
    row: initialEstimate.row,
    col: initialEstimate.col,
  };

  for (let iteration = 0; iteration < iterations; iteration++) {
    let h11 = 0;
    let h12 = 0;
    let h22 = 0;
    let b1 = 0;
    let b2 = 0;

    for (const observation of observations) {
      const rowDifference = estimate.row - observation.beaconPosition.row;
      const colDifference = estimate.col - observation.beaconPosition.col;
      const predictedRange = Math.max(
        Math.sqrt(
          rowDifference * rowDifference + colDifference * colDifference
        ),
        1e-6
      );

      const rowDerivative = rowDifference / predictedRange;
      const colDerivative = colDifference / predictedRange;
      const residual = observation.measuredRange - predictedRange;

      h11 += rowDerivative * rowDerivative;
      h12 += rowDerivative * colDerivative;
      h22 += colDerivative * colDerivative;
      b1 += rowDerivative * residual;
      b2 += colDerivative * residual;
    }

    const determinant = h11 * h22 - h12 * h12;

    if (Math.abs(determinant) < 1e-9) {
      break;
    }

    const deltaRow = (h22 * b1 - h12 * b2) / determinant;
    const deltaCol = (-h12 * b1 + h11 * b2) / determinant;

    estimate = {
      row: estimate.row + deltaRow,
      col: estimate.col + deltaCol,
    };

    if (Math.abs(deltaRow) + Math.abs(deltaCol) < 1e-6) {
      break;
    }
  }

  return estimate;
}

function attachRangeResiduals(
  observations: RangeObservation[],
  estimate: ContinuousPosition
): RangeObservation[] {
  return observations.map((observation) => {
    const predictedRange = distance(estimate, observation.beaconPosition);

    return {
      ...observation,
      residual: observation.measuredRange - predictedRange,
    };
  });
}

function inferGridSizeFromPath(path: Position[]): { rows: number; cols: number } {
  const maxRow = Math.max(...path.map((position) => position.row), 1);
  const maxCol = Math.max(...path.map((position) => position.col), 1);

  return {
    rows: maxRow + 1,
    cols: maxCol + 1,
  };
}

export function buildLocalizationSamples(
  path: Position[],
  noiseLevel = 0.35,
  gridRows?: number,
  gridCols?: number
): LocalizationSample[] {
  const samples: LocalizationSample[] = [];
  let previousEstimate: ContinuousPosition | null = null;

  if (path.length === 0) {
    return samples;
  }

  const inferredGridSize = inferGridSizeFromPath(path);
  const beacons = createDefaultBeacons(
    gridRows ?? inferredGridSize.rows,
    gridCols ?? inferredGridSize.cols
  );

  for (let step = 0; step < path.length; step++) {
    const truePosition = toContinuousPosition(path[step]);
    const noise = generateDeterministicNoise(step, noiseLevel);

    const measuredPosition: ContinuousPosition = {
      row: truePosition.row + noise.rowNoise,
      col: truePosition.col + noise.colNoise,
    };

    const estimatedPosition: ContinuousPosition =
      previousEstimate === null
        ? measuredPosition
        : smoothEstimate(previousEstimate, measuredPosition);

    const rangeObservations = buildRangeObservations(
      truePosition,
      beacons,
      step,
      noiseLevel
    );

    const rangeEstimatedPosition = estimatePositionFromRanges(
      rangeObservations,
      measuredPosition
    );

    const rangeObservationsWithResiduals = attachRangeResiduals(
      rangeObservations,
      rangeEstimatedPosition
    );

    const error = distance(truePosition, estimatedPosition);
    const rangeError = distance(truePosition, rangeEstimatedPosition);

    samples.push({
      step,
      truePosition,
      measuredPosition,
      estimatedPosition,
      rangeEstimatedPosition,
      rangeObservations: rangeObservationsWithResiduals,
      error,
      rangeError,
    });

    previousEstimate = estimatedPosition;
  }

  return samples;
}

export function calculateLocalizationMetrics(
  samples: LocalizationSample[],
  currentStep: number
): LocalizationMetrics {
  const activeSamples = samples.slice(0, currentStep + 1);

  if (activeSamples.length === 0) {
    return {
      currentError: 0,
      averageError: 0,
      maxError: 0,
      rmse: 0,
      rangeCurrentError: 0,
      rangeAverageError: 0,
      rangeRmse: 0,
      sampleCount: 0,
    };
  }

  const currentError = activeSamples[activeSamples.length - 1].error;
  const rangeCurrentError =
    activeSamples[activeSamples.length - 1].rangeError;

  const errorSum = activeSamples.reduce((sum, sample) => sum + sample.error, 0);
  const squaredErrorSum = activeSamples.reduce(
    (sum, sample) => sum + sample.error * sample.error,
    0
  );

  const rangeErrorSum = activeSamples.reduce(
    (sum, sample) => sum + sample.rangeError,
    0
  );
  const squaredRangeErrorSum = activeSamples.reduce(
    (sum, sample) => sum + sample.rangeError * sample.rangeError,
    0
  );

  return {
    currentError,
    averageError: errorSum / activeSamples.length,
    maxError: Math.max(...activeSamples.map((sample) => sample.error)),
    rmse: Math.sqrt(squaredErrorSum / activeSamples.length),
    rangeCurrentError,
    rangeAverageError: rangeErrorSum / activeSamples.length,
    rangeRmse: Math.sqrt(squaredRangeErrorSum / activeSamples.length),
    sampleCount: activeSamples.length,
  };
}

export function roundToGridCell(position: ContinuousPosition): Position {
  return {
    row: Math.round(position.row),
    col: Math.round(position.col),
  };
}
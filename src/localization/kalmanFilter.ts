import type { ContinuousPosition } from "../simulation/types";

export type KalmanFilterState = {
  stateVector: [number, number, number, number];
  covariance: number[][];
};

export type KalmanFilterConfig = {
  timeStep: number;
  processNoise: number;
  measurementNoise: number;
};

const defaultKalmanConfig: KalmanFilterConfig = {
  timeStep: 1,
  processNoise: 0.025,
  measurementNoise: 0.18,
};

function createIdentityMatrix(size: number): number[][] {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (row === col ? 1 : 0))
  );
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  return a.map((row) =>
    b[0].map((_, colIndex) =>
      row.reduce(
        (sum, value, rowIndex) => sum + value * b[rowIndex][colIndex],
        0
      )
    )
  );
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
}

function addMatrices(a: number[][], b: number[][]): number[][] {
  return a.map((row, rowIndex) =>
    row.map((value, colIndex) => value + b[rowIndex][colIndex])
  );
}

function invert2x2(matrix: number[][]): number[][] | null {
  const [[a, b], [c, d]] = matrix;
  // Scale before forming the determinant: an absolute cutoff rejects valid
  // small covariances and unscaled products can overflow for large ones.
  const scale = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
  if (!Number.isFinite(scale) || scale === 0) return null;
  const an = a / scale, bn = b / scale, cn = c / scale, dn = d / scale;
  const determinant = an * dn - bn * cn;

  if (an <= 0 || dn <= 0 || determinant <= 0 || !Number.isFinite(determinant)) {
    return null;
  }

  return [
    [(dn / determinant) / scale, (-bn / determinant) / scale],
    [(-cn / determinant) / scale, (an / determinant) / scale],
  ];
}

function getTransitionMatrix(timeStep: number): number[][] {
  return [
    [1, 0, timeStep, 0],
    [0, 1, 0, timeStep],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

function getProcessNoiseMatrix(processNoise: number): number[][] {
  // Educational discrete model: independent position/velocity increments per
  // simulation step. This is Q=qI, not a continuous white-acceleration model.
  return [
    [processNoise, 0, 0, 0],
    [0, processNoise, 0, 0],
    [0, 0, processNoise, 0],
    [0, 0, 0, processNoise],
  ];
}

function predictStateVector(
  stateVector: [number, number, number, number],
  timeStep: number
): [number, number, number, number] {
  return [
    stateVector[0] + stateVector[2] * timeStep,
    stateVector[1] + stateVector[3] * timeStep,
    stateVector[2],
    stateVector[3],
  ];
}

function predictCovariance(
  covariance: number[][],
  timeStep: number,
  processNoise: number
): number[][] {
  const transitionMatrix = getTransitionMatrix(timeStep);
  const transitionTranspose = transpose(transitionMatrix);
  const processNoiseMatrix = getProcessNoiseMatrix(processNoise);

  return addMatrices(
    multiplyMatrices(
      multiplyMatrices(transitionMatrix, covariance),
      transitionTranspose
    ),
    processNoiseMatrix
  );
}

export function createInitialKalmanState(
  initialPosition: ContinuousPosition
): KalmanFilterState {
  return {
    stateVector: [initialPosition.row, initialPosition.col, 0, 0],
    covariance: [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 2, 0],
      [0, 0, 0, 2],
    ],
  };
}

export function updateKalmanFilter(
  previousState: KalmanFilterState,
  measuredPosition: ContinuousPosition,
  config = defaultKalmanConfig
): KalmanFilterState {
  if (![config.timeStep, config.processNoise, config.measurementNoise].every(Number.isFinite)
      || config.timeStep <= 0 || config.processNoise < 0 || config.measurementNoise < 0
      || ![measuredPosition.row, measuredPosition.col, ...previousState.stateVector].every(Number.isFinite)
      || previousState.covariance.length !== 4
      || previousState.covariance.some(row => row.length !== 4 || !row.every(Number.isFinite))) {
    throw new Error("Kalman update requires finite observations/state, a 4x4 covariance, positive timeStep and nonnegative noise variances");
  }
  const predictedStateVector = predictStateVector(
    previousState.stateVector,
    config.timeStep
  );

  const predictedCovariance = predictCovariance(
    previousState.covariance,
    config.timeStep,
    config.processNoise
  );

  const innovation = [
    measuredPosition.row - predictedStateVector[0],
    measuredPosition.col - predictedStateVector[1],
  ];

  const innovationCovariance = [
    [
      predictedCovariance[0][0] + config.measurementNoise,
      predictedCovariance[0][1],
    ],
    [
      predictedCovariance[1][0],
      predictedCovariance[1][1] + config.measurementNoise,
    ],
  ];

  const invertedInnovationCovariance = invert2x2(innovationCovariance);

  if (!invertedInnovationCovariance) {
    return {
      stateVector: predictedStateVector,
      covariance: predictedCovariance,
    };
  }

  const kalmanGain = predictedCovariance.map((row) => [
    row[0] * invertedInnovationCovariance[0][0] +
      row[1] * invertedInnovationCovariance[1][0],
    row[0] * invertedInnovationCovariance[0][1] +
      row[1] * invertedInnovationCovariance[1][1],
  ]);

  const updatedStateVector: [number, number, number, number] = [
    predictedStateVector[0] +
      kalmanGain[0][0] * innovation[0] +
      kalmanGain[0][1] * innovation[1],
    predictedStateVector[1] +
      kalmanGain[1][0] * innovation[0] +
      kalmanGain[1][1] * innovation[1],
    predictedStateVector[2] +
      kalmanGain[2][0] * innovation[0] +
      kalmanGain[2][1] * innovation[1],
    predictedStateVector[3] +
      kalmanGain[3][0] * innovation[0] +
      kalmanGain[3][1] * innovation[1],
  ];

  const identity = createIdentityMatrix(4);
  const gainTimesMeasurementMatrix = kalmanGain.map((gainRow) => [
    gainRow[0],
    gainRow[1],
    0,
    0,
  ]);

  const covarianceUpdateMatrix = identity.map((row, rowIndex) =>
    row.map(
      (value, colIndex) => value - gainTimesMeasurementMatrix[rowIndex][colIndex]
    )
  );

  // Joseph form retains the positive measurement-noise contribution even
  // when cancellation makes I-KH nearly zero. Algebraically equivalent to
  // (I-KH)P in exact arithmetic; more stable in floating point.
  const josephCovariance = addMatrices(
    multiplyMatrices(multiplyMatrices(covarianceUpdateMatrix, predictedCovariance),
      transpose(covarianceUpdateMatrix)),
    kalmanGain.map(row => kalmanGain.map(other =>
      config.measurementNoise * (row[0] * other[0] + row[1] * other[1])))
  );
  const updatedCovariance = josephCovariance.map((row, i) => row.map((value, j) =>
    (value + josephCovariance[j][i]) / 2));

  return {
    stateVector: updatedStateVector,
    covariance: updatedCovariance,
  };
}

export function getKalmanPosition(
  state: KalmanFilterState
): ContinuousPosition {
  return {
    row: state.stateVector[0],
    col: state.stateVector[1],
  };
}

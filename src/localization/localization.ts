import type {
    ContinuousPosition,
    LocalizationMetrics,
    LocalizationSample,
    Position,
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

export function buildLocalizationSamples(
    path: Position[],
    noiseLevel = 0.35
): LocalizationSample[] {
    const samples: LocalizationSample[] = [];
    let previousEstimate: ContinuousPosition | null = null;

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

        const error = distance(truePosition, estimatedPosition);

        samples.push({
            step,
            truePosition,
            measuredPosition,
            estimatedPosition,
            error,
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
            sampleCount: 0,
        };
    }

    const currentError = activeSamples[activeSamples.length - 1].error;

    const errorSum = activeSamples.reduce((sum, sample) => sum + sample.error, 0);
    const squaredErrorSum = activeSamples.reduce(
        (sum, sample) => sum + sample.error * sample.error,
        0
    );

    return {
        currentError,
        averageError: errorSum / activeSamples.length,
        maxError: Math.max(...activeSamples.map((sample) => sample.error)),
        rmse: Math.sqrt(squaredErrorSum / activeSamples.length),
        sampleCount: activeSamples.length,
    };
}

export function roundToGridCell(position: ContinuousPosition): Position {
    return {
        row: Math.round(position.row),
        col: Math.round(position.col),
    };
}
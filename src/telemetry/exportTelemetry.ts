import type {
  LocalizationSample,
  PlannerName,
  Position,
  Scenario,
  SimulationMetrics,
} from "../simulation/types";

export type TelemetryExportPayload = {
  schemaVersion: 1;
  units: { position: "grid-cell"; time: "simulation-step" };
  scenarioSnapshot: Scenario;
  generatedAt: string;
  scenarioName: string;
  algorithm: PlannerName;
  metrics: SimulationMetrics;
  path: Position[];
  visited: Position[];
  localizationSamples: LocalizationSample[];
};

type TelemetryExportInput = {
  scenario: Scenario;
  algorithm: PlannerName;
  metrics: SimulationMetrics;
  path: Position[];
  visited: Position[];
  localizationSamples: LocalizationSample[];
};

function createFileName(
  scenarioName: string,
  algorithm: PlannerName,
  extension: "json" | "csv"
): string {
  const safeScenarioName = scenarioName.toLowerCase().replaceAll(" ", "-");
  const safeAlgorithm = algorithm.toLowerCase().replaceAll("*", "star");

  return `${safeScenarioName}-${safeAlgorithm}-telemetry.${extension}`;
}

function downloadFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export function buildPayload(input: TelemetryExportInput): TelemetryExportPayload {
  return {
    schemaVersion: 1,
    units: { position: "grid-cell", time: "simulation-step" },
    scenarioSnapshot: structuredClone(input.scenario),
    generatedAt: new Date().toISOString(),
    scenarioName: input.scenario.name,
    algorithm: input.algorithm,
    metrics: structuredClone(input.metrics),
    path: structuredClone(input.path),
    visited: structuredClone(input.visited),
    localizationSamples: structuredClone(input.localizationSamples),
  };
}

function formatNumber(value: number | undefined): string {
  if (value === undefined) {
    return "";
  }

  return value.toFixed(4);
}

export function convertSamplesToCsvRows(payload: TelemetryExportPayload): string {
  const header = [
    "scenario",
    "algorithm",
    "step",
    "true_row",
    "true_col",
    "measured_row",
    "measured_col",
    "estimated_row",
    "estimated_col",
    "localization_error",
    "path_row",
    "path_col",
  ];

  const rowCount = Math.max(
    payload.path.length,
    payload.localizationSamples.length
  );

  const rows = [];

  for (let index = 0; index < rowCount; index++) {
    const sample = payload.localizationSamples[index];
    const pathPosition = payload.path[index];

    rows.push([
      payload.scenarioName,
      payload.algorithm,
      (sample?.step ?? index).toString(),
      formatNumber(sample?.truePosition.row),
      formatNumber(sample?.truePosition.col),
      formatNumber(sample?.measuredPosition.row),
      formatNumber(sample?.measuredPosition.col),
      formatNumber(sample?.estimatedPosition.row),
      formatNumber(sample?.estimatedPosition.col),
      formatNumber(sample?.error),
      pathPosition?.row.toString() ?? "",
      pathPosition?.col.toString() ?? "",
    ]);
  }

  return [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function downloadTelemetryJson(input: TelemetryExportInput) {
  const payload = buildPayload(input);
  const fileName = createFileName(
    payload.scenarioName,
    payload.algorithm,
    "json"
  );

  downloadFile(fileName, JSON.stringify(payload, null, 2), "application/json");
}

export function downloadTelemetryCsv(input: TelemetryExportInput) {
  const payload = buildPayload(input);
  const fileName = createFileName(payload.scenarioName, payload.algorithm, "csv");
  const csvContent = convertSamplesToCsvRows(payload);

  downloadFile(fileName, csvContent, "text/csv");
}

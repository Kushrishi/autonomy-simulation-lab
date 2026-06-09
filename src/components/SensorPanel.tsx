import type { SensorReading } from "../simulation/types";

type SensorPanelProps = {
  readings: SensorReading[];
};

export default function SensorPanel({ readings }: SensorPanelProps) {
  return (
    <section className="panel">
      <h2>Range Sensors</h2>

      <div className="sensor-grid">
        {readings.map((reading) => (
          <div className="sensor-row" key={reading.direction}>
            <span>{reading.direction}</span>
            <strong>
              {reading.detectedObstacle
                ? `Obstacle at ${reading.distance}`
                : `Clear ${reading.distance}`}
            </strong>
          </div>
        ))}
      </div>

      <p className="panel-note">
        Sensors scan in four directions from the robot position and report the
        nearest obstacle within range.
      </p>
    </section>
  );
}
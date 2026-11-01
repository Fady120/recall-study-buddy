export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="progress">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      {label && <span className="progress-label">{label}</span>}
    </div>
  );
}

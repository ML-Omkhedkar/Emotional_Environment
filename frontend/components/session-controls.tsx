type SessionPhase = "idle" | "starting" | "active" | "paused" | "ended";

type SessionControlsProps = {
  sessionPhase: SessionPhase;
  audioMessage: string;
  volume: number;
  onTogglePlayback: () => void;
  onReset: () => void;
  onVolumeChange: (value: number) => void;
  canControlAudio: boolean;
};

export default function SessionControls({
  sessionPhase,
  audioMessage,
  volume,
  onTogglePlayback,
  onReset,
  onVolumeChange,
  canControlAudio,
}: SessionControlsProps) {
  const isPaused = sessionPhase === "paused";
  const isEnded = sessionPhase === "ended";
  const isStarting = sessionPhase === "starting";
  const playPauseLabel = isPaused ? "Resume" : "Pause";

  return (
    <section className="ee-controls" aria-label="Session controls">
      <div className="space-y-4">
        <div className="ee-controls-row">
          <div className="ee-pill ee-controls-meta" aria-live="polite">
            {audioMessage}
          </div>
          <div className="flex gap-2">
            {sessionPhase !== "idle" && !isStarting ? (
              <button
                className="ee-button ee-button-secondary"
                onClick={onTogglePlayback}
                type="button"
              >
                {isEnded ? "Replay" : playPauseLabel}
              </button>
            ) : null}
            <button
              className="ee-button ee-button-secondary"
              onClick={onReset}
              type="button"
            >
              {isEnded ? "Return" : "Reset"}
            </button>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="ee-controls-meta flex items-center justify-between gap-3">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </span>
          <input
            aria-label="Volume"
            className="ee-slider"
            disabled={!canControlAudio}
            max="1"
            min="0"
            onChange={(event) => onVolumeChange(Number(event.target.value))}
            step="0.05"
            type="range"
            value={volume}
          />
        </label>
      </div>
    </section>
  );
}

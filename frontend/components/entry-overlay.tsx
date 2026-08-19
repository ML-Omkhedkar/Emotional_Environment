type EntryOverlayProps = {
  visible: boolean;
  audioMessage: string;
  isCheckingAudio: boolean;
  onStart: () => void;
};

export default function EntryOverlay({
  visible,
  audioMessage,
  isCheckingAudio,
  onStart,
}: EntryOverlayProps) {
  return (
    <div className="ee-entry-shell">
      <section
        className="ee-entry"
        data-visible={visible}
        aria-hidden={!visible}
      >
        <div className="space-y-6">
          <p className="ee-kicker">Emotional Environment</p>
          <div className="space-y-4">
            <h1 className="ee-title">Rain over quiet mountains.</h1>
            <p className="ee-copy">
              Stay here for a moment. Let the evening settle, and let the
              silence feel full instead of empty.
            </p>
          </div>
          <div className="space-y-4">
            <button className="ee-button w-full sm:w-auto" onClick={onStart}>
              Start the session
            </button>
            <p className="ee-status" aria-live="polite">
              {isCheckingAudio ? "Checking for a local V0 track..." : audioMessage}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

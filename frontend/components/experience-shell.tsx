"use client";

import { useEffect, useRef, useState } from "react";

import EntryOverlay from "@/components/entry-overlay";
import EnvironmentScene from "@/components/environment-scene";
import SessionControls from "@/components/session-controls";

type SessionPhase = "idle" | "starting" | "active" | "paused" | "ended";
type AudioState =
  | "checking"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "unavailable"
  | "error";

const AUDIO_CANDIDATES = [
  "/audio/v0-track.mp3",
  "/audio/v0-track.ogg",
  "/audio/v0-track.wav",
  "/audio/v0-track.m4a",
];

export default function ExperienceShell() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("idle");
  const [audioState, setAudioState] = useState<AudioState>("checking");
  const [audioSource, setAudioSource] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.6);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function detectAudio() {
      for (const candidate of AUDIO_CANDIDATES) {
        try {
          const response = await fetch(candidate, {
            method: "HEAD",
            cache: "no-store",
          });

          if (response.ok) {
            if (!cancelled) {
              setAudioSource(candidate);
              setAudioState("ready");
            }
            return;
          }
        } catch {
          // Ignore probe failures and continue checking the next candidate.
        }
      }

      if (!cancelled) {
        setAudioState("unavailable");
      }
    }

    void detectAudio();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (sessionPhase !== "active") {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (audioRef.current && audioSource) {
        setPlaybackSeconds(Math.floor(audioRef.current.currentTime));
        return;
      }

      setPlaybackSeconds((current) => current + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [audioSource, sessionPhase]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const audioMessage = getAudioMessage(audioState, hasInteracted);
  const isCheckingAudio = audioState === "checking";
  const canControlAudio = audioSource !== null && audioState !== "checking";

  async function handleStart() {
    setHasInteracted(true);
    setPlaybackSeconds(0);
    setSessionPhase("starting");

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    if (audioSource) {
      const started = await attemptAudioPlay();
      if (!started) {
        setAudioState("error");
      }
    }

    schedulePhaseTransition("active", 1400);
  }

  async function handleTogglePlayback() {
    if (sessionPhase === "ended") {
      await handleStart();
      return;
    }

    if (sessionPhase === "paused") {
      setSessionPhase("active");

      if (audioSource) {
        const resumed = await attemptAudioPlay();
        if (!resumed) {
          setAudioState("error");
        }
      }

      return;
    }

    if (sessionPhase === "active" || sessionPhase === "starting") {
      if (audioRef.current && audioSource) {
        audioRef.current.pause();
        setAudioState("paused");
      }

      setSessionPhase("paused");
    }
  }

  function handleReset() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    setPlaybackSeconds(0);
    setSessionPhase("idle");
    setAudioState(audioSource ? "ready" : audioState === "checking" ? "checking" : "unavailable");
  }

  async function attemptAudioPlay() {
    if (!audioRef.current) {
      return false;
    }

    try {
      await audioRef.current.play();
      setAudioState("playing");
      return true;
    } catch {
      return false;
    }
  }

  function schedulePhaseTransition(nextPhase: SessionPhase, delay: number) {
    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      setSessionPhase(nextPhase);
      transitionTimeoutRef.current = null;
    }, delay);
  }

  return (
    <main className="ee-shell">
      <EnvironmentScene
        playbackSeconds={playbackSeconds}
        sessionPhase={sessionPhase}
      />

      <div className="ee-content">
        <EntryOverlay
          audioMessage={audioMessage}
          isCheckingAudio={isCheckingAudio}
          onStart={() => {
            void handleStart();
          }}
          visible={sessionPhase === "idle"}
        />

        <div className="ee-controls-wrap">
          {sessionPhase !== "idle" ? (
            <SessionControls
              audioMessage={audioMessage}
              canControlAudio={canControlAudio}
              onReset={handleReset}
              onTogglePlayback={() => {
                void handleTogglePlayback();
              }}
              onVolumeChange={setVolume}
              sessionPhase={sessionPhase}
              volume={volume}
            />
          ) : null}
        </div>
      </div>

      <audio
        onEnded={() => {
          setAudioState("ended");
          setSessionPhase("ended");
        }}
        onPause={() => {
          setAudioState((current) =>
            current === "playing" ? "paused" : current,
          );
        }}
        onPlay={() => {
          setAudioState("playing");
        }}
        preload="metadata"
        ref={audioRef}
        src={audioSource ?? undefined}
      />
    </main>
  );
}

function getAudioMessage(audioState: AudioState, hasInteracted: boolean) {
  switch (audioState) {
    case "checking":
      return "Checking for a local V0 track.";
    case "ready":
      return hasInteracted
        ? "Local audio is ready for the session."
        : "A local V0 track is ready when you are.";
    case "playing":
      return "Local audio is carrying the evening forward.";
    case "paused":
      return "Audio is paused. The weather stays with you.";
    case "ended":
      return "The track has ended. You can begin again.";
    case "error":
      return "Audio could not start, but the environment remains available.";
    case "unavailable":
      return "No local V0 track is available yet. The environment still works without audio.";
    default:
      return "The evening is waiting.";
  }
}

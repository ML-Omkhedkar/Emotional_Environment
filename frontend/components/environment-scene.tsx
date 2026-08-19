import type { CSSProperties } from "react";

type SessionPhase = "idle" | "starting" | "active" | "paused" | "ended";

type EnvironmentSceneProps = {
  sessionPhase: SessionPhase;
  playbackSeconds: number;
};

type SceneStyle = CSSProperties & {
  "--scene-progress": string;
};

export default function EnvironmentScene({
  sessionPhase,
  playbackSeconds,
}: EnvironmentSceneProps) {
  const progress = getSceneProgress(sessionPhase, playbackSeconds);

  const style: SceneStyle = {
    "--scene-progress": progress.toFixed(3),
  };

  return (
    <div className="ee-scene" data-phase={sessionPhase} style={style}>
      <div className="ee-layer ee-sky" />
      <div className="ee-layer ee-light" />
      <div className="ee-layer ee-mountain-back" />
      <div className="ee-layer ee-fog ee-fog-one" />
      <div className="ee-layer ee-mountain-front" />
      <div className="ee-layer ee-fog ee-fog-two" />
      <div className="ee-layer ee-rain" />
      <div className="ee-layer ee-vignette" />
    </div>
  );
}

function getSceneProgress(sessionPhase: SessionPhase, playbackSeconds: number) {
  const timeBoost = Math.min(playbackSeconds / 48, 1);

  switch (sessionPhase) {
    case "idle":
      return 0.18;
    case "starting":
      return 0.34 + timeBoost * 0.18;
    case "active":
      return 0.56 + timeBoost * 0.34;
    case "paused":
      return 0.44 + timeBoost * 0.16;
    case "ended":
      return 0.22;
    default:
      return 0.18;
  }
}

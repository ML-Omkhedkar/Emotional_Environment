"use client";

import React, { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface PerformanceMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  heapMemoryMb: number | null;
}

interface ControllerProps {
  onMetricsUpdate: (metrics: PerformanceMetrics) => void;
}

function FirstPersonController({ onMetricsUpdate }: ControllerProps) {
  const { camera, gl } = useThree();

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const isPointerLocked = useRef<boolean>(false);
  const yawRef = useRef<number>(0);
  const pitchRef = useRef<number>(0);

  // Performance measurement tracking
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const lastStatsUpdateRef = useRef<number>(performance.now());
  const frameDeltasRef = useRef<number[]>([]);

  useEffect(() => {
    // Set rotation order to YXZ for FPS style pitch/yaw
    camera.rotation.order = "YXZ";
    camera.position.set(0, 1.6, 5);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current) return;

      const sensitivity = 0.0022;
      yawRef.current -= e.movementX * sensitivity;
      pitchRef.current -= e.movementY * sensitivity;

      // Clamp vertical pitch to prevent flipping (~85 degrees up/down)
      const maxPitch = Math.PI / 2 - 0.05;
      pitchRef.current = Math.max(-maxPitch, Math.min(maxPitch, pitchRef.current));

      camera.rotation.x = pitchRef.current;
      camera.rotation.y = yawRef.current;
    };

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === gl.domElement;
    };

    const handleCanvasClick = () => {
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock();
      }
    };

    const domElement = gl.domElement;
    domElement.addEventListener("click", handleCanvasClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    return () => {
      domElement.removeEventListener("click", handleCanvasClick);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
    };
  }, [camera, gl]);

  useFrame((_, delta) => {
    const speed = 4.5; // units per second
    const moveDistance = speed * delta;

    const moveVector = new THREE.Vector3();

    // Forward/Backward (Z axis aligned to horizontal yaw)
    if (keysPressed.current["KeyW"] || keysPressed.current["ArrowUp"]) {
      moveVector.z -= 1;
    }
    if (keysPressed.current["KeyS"] || keysPressed.current["ArrowDown"]) {
      moveVector.z += 1;
    }

    // Left/Right Strafe
    if (keysPressed.current["KeyA"] || keysPressed.current["ArrowLeft"]) {
      moveVector.x -= 1;
    }
    if (keysPressed.current["KeyD"] || keysPressed.current["ArrowRight"]) {
      moveVector.x += 1;
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();

      // Apply horizontal yaw rotation only (keep walking on the ground plane)
      const horizontalAngle = yawRef.current;
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), horizontalAngle);

      camera.position.x += moveVector.x * moveDistance;
      camera.position.z += moveVector.z * moveDistance;
    }

    // Measure frame metrics
    const now = performance.now();
    frameCountRef.current += 1;
    frameDeltasRef.current.push(delta * 1000);

    // Update telemetry HUD at ~4Hz (every 250ms) to prevent React render bottleneck
    if (now - lastStatsUpdateRef.current >= 250) {
      const elapsedSec = (now - lastTimeRef.current) / 1000;
      const calculatedFps = Math.round(frameCountRef.current / elapsedSec);

      const avgFrameTime =
        frameDeltasRef.current.length > 0
          ? frameDeltasRef.current.reduce((a, b) => a + b, 0) /
            frameDeltasRef.current.length
          : 0;

      // Extract WebGL render stats
      const renderInfo = gl.info.render;
      const memoryInfo = gl.info.memory;

      // Chrome/Edge memory API if available
      const perfMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      const heapMemoryMb = perfMemory
        ? Math.round((perfMemory.usedJSHeapSize / (1024 * 1024)) * 10) / 10
        : null;

      onMetricsUpdate({
        fps: calculatedFps,
        frameTimeMs: Math.round(avgFrameTime * 100) / 100,
        drawCalls: renderInfo.calls,
        triangles: renderInfo.triangles,
        geometries: memoryInfo.geometries,
        textures: memoryInfo.textures,
        heapMemoryMb,
      });

      // Reset accumulators
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      lastStatsUpdateRef.current = now;
      frameDeltasRef.current = [];
    }
  });

  return null;
}

export default function TechnicalSpike3D() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTimeMs: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    heapMemoryMb: null,
  });

  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement !== null);
    };
    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#0b0f19", overflow: "hidden" }}>
      {/* R3F Canvas */}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 1.6, 5] }}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        {/* Dark background color */}
        <color attach="background" args={["#0b0f19"]} />

        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.25} color="#cbd5e1" />
        <directionalLight position={[5, 12, 4]} intensity={0.85} color="#94a3b8" />

        {/* Ground Plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[50, 50, 1, 1]} />
          <meshStandardMaterial color="#1e293b" roughness={0.9} />
        </mesh>

        {/* Simple Object 1: Box / Monolith */}
        <mesh position={[-2.5, 1, -4]}>
          <boxGeometry args={[1.5, 2, 1.5]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>

        {/* Simple Object 2: Cylinder / Column */}
        <mesh position={[3, 1.5, -5]}>
          <cylinderGeometry args={[0.7, 0.7, 3, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>

        {/* First Person Movement and Stats tracking */}
        <FirstPersonController onMetricsUpdate={setMetrics} />
      </Canvas>

      {/* Development Telemetry & Status Readout HUD */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          backgroundColor: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(6px)",
          color: "#f8fafc",
          padding: "14px 18px",
          borderRadius: "8px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "13px",
          lineHeight: "1.6",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          pointerEvents: "none",
          zIndex: 10,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          minWidth: "240px",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#38bdf8", marginBottom: "4px" }}>
          EE Phase 1: 3D Technical Spike
        </div>
        <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "10px" }}>
          Target: i5-6400 / 8GB RAM / Intel HD Graphics
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2px 12px" }}>
          <span style={{ color: "#94a3b8" }}>FPS:</span>
          <span style={{ fontWeight: "bold", color: metrics.fps >= 55 ? "#4ade80" : metrics.fps >= 30 ? "#facc15" : "#f87171" }}>
            {metrics.fps > 0 ? metrics.fps : "Measuring..."}
          </span>

          <span style={{ color: "#94a3b8" }}>Frame Time:</span>
          <span>{metrics.frameTimeMs > 0 ? `${metrics.frameTimeMs} ms` : "--"}</span>

          <span style={{ color: "#94a3b8" }}>Draw Calls:</span>
          <span>{metrics.drawCalls}</span>

          <span style={{ color: "#94a3b8" }}>Triangles:</span>
          <span>{metrics.triangles}</span>

          <span style={{ color: "#94a3b8" }}>Geometries:</span>
          <span>{metrics.geometries}</span>

          {metrics.heapMemoryMb !== null && (
            <>
              <span style={{ color: "#94a3b8" }}>JS Heap:</span>
              <span>{metrics.heapMemoryMb} MB</span>
            </>
          )}

          <span style={{ color: "#94a3b8" }}>Mouse Lock:</span>
          <span style={{ color: isLocked ? "#4ade80" : "#facc15" }}>
            {isLocked ? "Active (Locked)" : "Inactive (Click canvas)"}
          </span>
        </div>

        <div
          style={{
            marginTop: "12px",
            paddingTop: "8px",
            borderTop: "1px solid rgba(148, 163, 184, 0.2)",
            fontSize: "11px",
            color: "#94a3b8",
          }}
        >
          <div>• Click anywhere to lock mouse look</div>
          <div>• Move: W/A/S/D or Arrow Keys</div>
          <div>• Look: Mouse movement</div>
          <div>• Press ESC to release mouse</div>
        </div>
      </div>
    </div>
  );
}

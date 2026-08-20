"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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

// Deterministic terrain elevation function
function getTerrainHeight(x: number, z: number): number {
  const d = Math.sqrt(x * x + z * z);
  // Keep central clearing relatively flat, create rolling hills outward
  const baseHills =
    Math.sin(x * 0.08) * Math.cos(z * 0.08) * 1.8 +
    Math.sin(x * 0.15 + 1.2) * 0.8 +
    Math.cos(z * 0.18 + 0.5) * 0.6;
  const centralFlattening = Math.min(1, Math.max(0, (d - 6) / 20));
  return baseHills * centralFlattening;
}

// -------------------------------------------------------------
// 1. Terrain Mesh
// -------------------------------------------------------------
function Terrain() {
  const geometry = useMemo(() => {
    const size = 80;
    const segments = 48;
    const plane = new THREE.PlaneGeometry(size, size, segments, segments);
    plane.rotateX(-Math.PI / 2);

    const pos = plane.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainHeight(x, z);
      pos.setY(i, y);
    }
    plane.computeVertexNormals();
    return plane;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#1b2820"
        roughness={0.92}
        metalness={0.05}
        flatShading={true}
      />
    </mesh>
  );
}

// -------------------------------------------------------------
// 2. Distant Mountains
// -------------------------------------------------------------
function Mountains() {
  const mountainData = useMemo(
    () => [
      { pos: [0, 18, -75] as [number, number, number], scale: [36, 42, 28] as [number, number, number], rot: 0.2 },
      { pos: [-60, 22, -60] as [number, number, number], scale: [40, 50, 32] as [number, number, number], rot: -0.4 },
      { pos: [65, 20, -55] as [number, number, number], scale: [38, 46, 30] as [number, number, number], rot: 0.8 },
      { pos: [-75, 16, 20] as [number, number, number], scale: [34, 38, 26] as [number, number, number], rot: 1.1 },
      { pos: [70, 19, 30] as [number, number, number], scale: [36, 44, 28] as [number, number, number], rot: -0.9 },
      { pos: [-20, 24, 75] as [number, number, number], scale: [42, 52, 34] as [number, number, number], rot: 0.5 },
      { pos: [45, 17, 70] as [number, number, number], scale: [35, 40, 28] as [number, number, number], rot: -0.3 },
    ],
    []
  );

  return (
    <group>
      {mountainData.map((m, i) => (
        <mesh key={i} position={m.pos} scale={m.scale} rotation={[0, m.rot, 0]}>
          <coneGeometry args={[1, 1, 6, 1]} />
          <meshStandardMaterial
            color="#0f1924"
            roughness={0.98}
            metalness={0.0}
            flatShading={true}
          />
        </mesh>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// 3. Instanced Forest Trees (Trunks + Canopies)
// -------------------------------------------------------------
function Forest() {
  const treeCount = 38;
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageMeshRef = useRef<THREE.InstancedMesh>(null);

  const treeTransforms = useMemo(() => {
    const list: { x: number; z: number; scale: number; rotY: number }[] = [];
    let seed = 42;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < treeCount; i++) {
      // Scatter in perimeter clusters around central clearing
      const angle = random() * Math.PI * 2;
      const radius = 9 + random() * 26;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scale = 0.75 + random() * 0.6;
      const rotY = random() * Math.PI * 2;
      list.push({ x, z, scale, rotY });
    }
    return list;
  }, [treeCount]);

  useEffect(() => {
    if (!trunkMeshRef.current || !foliageMeshRef.current) return;

    const dummy = new THREE.Object3D();

    treeTransforms.forEach((tree, idx) => {
      const terrainY = getTerrainHeight(tree.x, tree.z);

      // 1. Trunk
      const trunkHeight = 2.4 * tree.scale;
      dummy.position.set(tree.x, terrainY + trunkHeight / 2, tree.z);
      dummy.scale.set(0.35 * tree.scale, trunkHeight, 0.35 * tree.scale);
      dummy.rotation.set(0, tree.rotY, 0);
      dummy.updateMatrix();
      trunkMeshRef.current?.setMatrixAt(idx, dummy.matrix);

      // 2. Canopy (Foliage Cone)
      const canopyHeight = 4.5 * tree.scale;
      dummy.position.set(tree.x, terrainY + trunkHeight + canopyHeight * 0.4, tree.z);
      dummy.scale.set(2.0 * tree.scale, canopyHeight, 2.0 * tree.scale);
      dummy.rotation.set(0, tree.rotY + 0.3, 0);
      dummy.updateMatrix();
      foliageMeshRef.current?.setMatrixAt(idx, dummy.matrix);
    });

    trunkMeshRef.current.instanceMatrix.needsUpdate = true;
    foliageMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [treeTransforms]);

  return (
    <group>
      {/* Instanced Trunks: 1 draw call for all 38 trees */}
      <instancedMesh
        ref={trunkMeshRef}
        args={[undefined, undefined, treeCount]}
      >
        <cylinderGeometry args={[0.3, 0.45, 1, 6]} />
        <meshStandardMaterial color="#1a1512" roughness={0.95} />
      </instancedMesh>

      {/* Instanced Foliage: 1 draw call for all 38 canopies */}
      <instancedMesh
        ref={foliageMeshRef}
        args={[undefined, undefined, treeCount]}
      >
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial
          color="#14261c"
          roughness={0.9}
          flatShading={true}
        />
      </instancedMesh>
    </group>
  );
}

// -------------------------------------------------------------
// 4. Natural Low-Poly Rocks
// -------------------------------------------------------------
function Rocks() {
  const rockCount = 14;
  const rockMeshRef = useRef<THREE.InstancedMesh>(null);

  const rockTransforms = useMemo(() => {
    const list: { x: number; z: number; scaleX: number; scaleY: number; scaleZ: number; rotX: number; rotY: number; rotZ: number }[] = [];
    let seed = 108;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < rockCount; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 4 + random() * 28;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const scaleBase = 0.6 + random() * 1.2;
      list.push({
        x,
        z,
        scaleX: scaleBase * (0.8 + random() * 0.5),
        scaleY: scaleBase * (0.6 + random() * 0.5),
        scaleZ: scaleBase * (0.8 + random() * 0.5),
        rotX: random() * Math.PI,
        rotY: random() * Math.PI * 2,
        rotZ: random() * Math.PI,
      });
    }
    return list;
  }, [rockCount]);

  useEffect(() => {
    if (!rockMeshRef.current) return;
    const dummy = new THREE.Object3D();

    rockTransforms.forEach((rock, idx) => {
      const terrainY = getTerrainHeight(rock.x, rock.z);
      dummy.position.set(rock.x, terrainY + rock.scaleY * 0.35, rock.z);
      dummy.scale.set(rock.scaleX, rock.scaleY, rock.scaleZ);
      dummy.rotation.set(rock.rotX, rock.rotY, rock.rotZ);
      dummy.updateMatrix();
      rockMeshRef.current?.setMatrixAt(idx, dummy.matrix);
    });

    rockMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [rockTransforms]);

  return (
    /* Instanced Rocks: 1 draw call */
    <instancedMesh
      ref={rockMeshRef}
      args={[undefined, undefined, rockCount]}
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#29333d"
        roughness={0.92}
        metalness={0.08}
        flatShading={true}
      />
    </instancedMesh>
  );
}

// -------------------------------------------------------------
// 5. Lightweight Rain Particle System
// -------------------------------------------------------------
function Rain({ count = 1200 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();

  const [positions, initialOffsets] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);
    let seed = 300;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const offsetX = (random() - 0.5) * 44;
      const offsetY = random() * 22;
      const offsetZ = (random() - 0.5) * 44;

      offsets[idx] = offsetX;
      offsets[idx + 1] = offsetY;
      offsets[idx + 2] = offsetZ;

      pos[idx] = offsetX;
      pos[idx + 1] = offsetY;
      pos[idx + 2] = offsetZ;
    }
    return [pos, offsets];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const camPos = camera.position;
    const fallSpeed = 26; // units/sec
    const fallAmount = fallSpeed * delta;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Fall down
      arr[idx + 1] -= fallAmount;

      // Wrap around camera bounding volume
      if (arr[idx + 1] < 0) {
        arr[idx + 1] = 22;
        arr[idx] = camPos.x + initialOffsets[idx];
        arr[idx + 2] = camPos.z + initialOffsets[idx + 2];
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#93c5fd"
        transparent={true}
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// 6. First-Person Controller with Terrain Elevation Tracking
// -------------------------------------------------------------
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
    camera.rotation.order = "YXZ";
    const startX = 0;
    const startZ = 4;
    const startY = getTerrainHeight(startX, startZ) + 1.6;
    camera.position.set(startX, startY, startZ);

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
    const speed = 4.0; // walk speed
    const moveDistance = speed * delta;

    const moveVector = new THREE.Vector3();

    if (keysPressed.current["KeyW"] || keysPressed.current["ArrowUp"]) {
      moveVector.z -= 1;
    }
    if (keysPressed.current["KeyS"] || keysPressed.current["ArrowDown"]) {
      moveVector.z += 1;
    }
    if (keysPressed.current["KeyA"] || keysPressed.current["ArrowLeft"]) {
      moveVector.x -= 1;
    }
    if (keysPressed.current["KeyD"] || keysPressed.current["ArrowRight"]) {
      moveVector.x += 1;
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();

      const horizontalAngle = yawRef.current;
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), horizontalAngle);

      camera.position.x += moveVector.x * moveDistance;
      camera.position.z += moveVector.z * moveDistance;

      // Keep user bounds within world slice area
      const maxRadius = 36;
      const currentDist = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      if (currentDist > maxRadius) {
        camera.position.x = (camera.position.x / currentDist) * maxRadius;
        camera.position.z = (camera.position.z / currentDist) * maxRadius;
      }
    }

    // Terrain Elevation Follower (Smooth eye height)
    const targetY = getTerrainHeight(camera.position.x, camera.position.z) + 1.6;
    camera.position.y += (targetY - camera.position.y) * Math.min(1, delta * 8);

    // Performance telemetry
    const now = performance.now();
    frameCountRef.current += 1;
    frameDeltasRef.current.push(delta * 1000);

    if (now - lastStatsUpdateRef.current >= 250) {
      const elapsedSec = (now - lastTimeRef.current) / 1000;
      const calculatedFps = Math.round(frameCountRef.current / elapsedSec);

      const avgFrameTime =
        frameDeltasRef.current.length > 0
          ? frameDeltasRef.current.reduce((a, b) => a + b, 0) /
            frameDeltasRef.current.length
          : 0;

      const renderInfo = gl.info.render;
      const memoryInfo = gl.info.memory;

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

      frameCountRef.current = 0;
      lastTimeRef.current = now;
      lastStatsUpdateRef.current = now;
      frameDeltasRef.current = [];
    }
  });

  return null;
}

// -------------------------------------------------------------
// 7. Main Phase 1A World Slice Scene
// -------------------------------------------------------------
export default function WorldSlice3D() {
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
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#0b111a", overflow: "hidden" }}>
      {/* R3F Canvas */}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 300, position: [0, 2, 4] }}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        {/* Dark rainy evening atmospheric background */}
        <color attach="background" args={["#0b111a"]} />

        {/* Distance Fog: hides distant boundaries smoothly */}
        <fog attach="fog" args={["#0b111a", 15, 75]} />

        {/* Evening Lighting */}
        <ambientLight intensity={0.3} color="#2b394a" />
        <directionalLight
          position={[-30, 25, -20]}
          intensity={0.65}
          color="#8fa8bf"
        />
        <directionalLight
          position={[20, 10, 30]}
          intensity={0.2}
          color="#3b4d61"
        />

        {/* World Slice Components */}
        <Terrain />
        <Mountains />
        <Forest />
        <Rocks />
        <Rain count={1200} />

        {/* Controller & Telemetry */}
        <FirstPersonController onMetricsUpdate={setMetrics} />
      </Canvas>

      {/* Development Telemetry & Status Readout HUD */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          backgroundColor: "rgba(11, 17, 26, 0.88)",
          backdropFilter: "blur(8px)",
          color: "#f8fafc",
          padding: "14px 18px",
          borderRadius: "8px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "13px",
          lineHeight: "1.6",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          pointerEvents: "none",
          zIndex: 10,
          boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
          minWidth: "260px",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#38bdf8", marginBottom: "2px" }}>
          EE Phase 1A: Vertical World Slice
        </div>
        <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "10px" }}>
          Target: i5-6400T / Intel HD 530 / 8GB RAM
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
          <span>{metrics.triangles.toLocaleString()}</span>

          <span style={{ color: "#94a3b8" }}>Geometries:</span>
          <span>{metrics.geometries}</span>

          {metrics.heapMemoryMb !== null && (
            <>
              <span style={{ color: "#94a3b8" }}>JS Heap:</span>
              <span>{metrics.heapMemoryMb} MB</span>
            </>
          )}

          <span style={{ color: "#94a3b8" }}>Mouse Look:</span>
          <span style={{ color: isLocked ? "#4ade80" : "#facc15" }}>
            {isLocked ? "Active (Locked)" : "Click scene to lock"}
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

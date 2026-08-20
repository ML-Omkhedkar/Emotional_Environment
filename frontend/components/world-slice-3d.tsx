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

// -------------------------------------------------------------
// 1. Natural Terrain Elevation Model
// -------------------------------------------------------------
function getTerrainHeight(x: number, z: number): number {
  // 1. Base Rolling Topography
  const baseTerrain =
    Math.sin(x * 0.07) * Math.cos(z * 0.07) * 2.2 +
    Math.sin(x * 0.14 + 1.1) * 0.9 +
    Math.cos(z * 0.16 + 0.4) * 0.8;

  // 2. Signature Viewpoint Promontory (High Rocky Bluff at X: 14 to 24, Z: -18 to -8)
  const distToViewpoint = Math.hypot(x - 17, z - 13);
  const viewpointBluff = Math.max(0, 1 - distToViewpoint / 10) * 3.8;

  // 3. Water Basin & Stream Depression (Pond at X: -14 to -2, Z: -16 to -2)
  const distToPond = Math.hypot(x + 8, z + 8);
  const pondCarving = Math.max(0, 1 - distToPond / 11) * 2.6;

  // 4. Stream Bed leading from north into the pond
  const streamX = -6 + Math.sin(z * 0.15) * 3.0;
  const distToStream = Math.abs(x - streamX);
  const isStreamZ = z > -8 && z < 28;
  const streamCarving = isStreamZ ? Math.max(0, 1 - distToStream / 3.5) * 1.4 : 0;

  // 5. Pathway smoothing (natural walkable valley path)
  const distToPath = Math.abs(x - (z * 0.35 + 2));
  const pathSmoothing = Math.max(0, 1 - distToPath / 4.0) * 0.5;

  return baseTerrain + viewpointBluff - pondCarving - streamCarving - pathSmoothing;
}

// -------------------------------------------------------------
// 2. Terrain Component
// -------------------------------------------------------------
function Terrain() {
  const geometry = useMemo(() => {
    const size = 90;
    const segments = 56;
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
        color="#18231c"
        roughness={0.94}
        metalness={0.04}
        flatShading={true}
      />
    </mesh>
  );
}

// -------------------------------------------------------------
// 3. Mountain Ridge & Alpine Peak Backdrops
// -------------------------------------------------------------
function Mountains() {
  const mountainData = useMemo(
    () => [
      // Distant Alpine Peaks (Dark silhouette against evening twilight sky)
      { pos: [0, 32, -100] as [number, number, number], scale: [52, 65, 38] as [number, number, number], rot: 0.15, col: "#091019" },
      { pos: [-80, 36, -85] as [number, number, number], scale: [58, 72, 42] as [number, number, number], rot: -0.35, col: "#080e17" },
      { pos: [85, 30, -80] as [number, number, number], scale: [54, 62, 38] as [number, number, number], rot: 0.7, col: "#0a121b" },
      { pos: [-105, 26, 20] as [number, number, number], scale: [48, 54, 36] as [number, number, number], rot: 1.0, col: "#091018" },
      { pos: [95, 28, 35] as [number, number, number], scale: [50, 58, 38] as [number, number, number], rot: -0.8, col: "#0a121c" },
      { pos: [-25, 34, 100] as [number, number, number], scale: [56, 68, 42] as [number, number, number], rot: 0.4, col: "#080e16" },
      { pos: [60, 25, 95] as [number, number, number], scale: [48, 52, 36] as [number, number, number], rot: -0.25, col: "#09111a" },

      // Mid-distance Valley Ridges (Atmospheric layering)
      { pos: [35, 14, -55] as [number, number, number], scale: [32, 28, 22] as [number, number, number], rot: 0.45, col: "#101b26" },
      { pos: [-45, 16, -50] as [number, number, number], scale: [36, 32, 24] as [number, number, number], rot: -0.6, col: "#0f1a25" },
      { pos: [45, 12, 50] as [number, number, number], scale: [30, 26, 20] as [number, number, number], rot: -0.3, col: "#111c27" },
    ],
    []
  );

  return (
    <group>
      {mountainData.map((m, i) => (
        <mesh key={i} position={m.pos} scale={m.scale} rotation={[0, m.rot, 0]}>
          <coneGeometry args={[1, 1, 7, 1]} />
          <meshStandardMaterial
            color={m.col}
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
// 4. Multi-Tiered Instanced Forest (3 Tree Archetypes)
// -------------------------------------------------------------
function Forest() {
  const tallCount = 28;
  const broadCount = 22;
  const saplingCount = 14;

  const tallTrunkRef = useRef<THREE.InstancedMesh>(null);
  const tallFoliageRef = useRef<THREE.InstancedMesh>(null);
  const broadTrunkRef = useRef<THREE.InstancedMesh>(null);
  const broadFoliageRef = useRef<THREE.InstancedMesh>(null);
  const saplingRef = useRef<THREE.InstancedMesh>(null);

  // Procedural tree placement avoiding water basin and framing the viewpoint
  const { tallTrees, broadTrees, saplings } = useMemo(() => {
    let seed = 77;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const isNearPond = (x: number, z: number) => Math.hypot(x + 8, z + 8) < 8.5;
    const isSignaturePlatform = (x: number, z: number) => Math.hypot(x - 17, z - 13) < 4.0;

    const generateCluster = (count: number, minR: number, maxR: number, scaleBase: number) => {
      const list: { x: number; z: number; scale: number; rotY: number }[] = [];
      while (list.length < count) {
        const angle = random() * Math.PI * 2;
        const radius = minR + random() * (maxR - minR);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        if (isNearPond(x, z) || isSignaturePlatform(x, z)) continue;

        const scale = scaleBase * (0.8 + random() * 0.45);
        const rotY = random() * Math.PI * 2;
        list.push({ x, z, scale, rotY });
      }
      return list;
    };

    // 1. Tall Conifers (High ridge silhouettes and distant framing)
    const tall = generateCluster(tallCount, 12, 38, 1.25);
    // 2. Broad Alpine Pines (Mid-slope clusters)
    const broad = generateCluster(broadCount, 8, 32, 1.0);
    // 3. Saplings / Junipers (Trail borders & rock accents)
    const sapl = generateCluster(saplingCount, 5, 26, 0.65);

    // Explicit Signature Tree at the Viewpoint Edge framing the valley
    tall.push({ x: 19.5, z: 10.5, scale: 1.4, rotY: 0.8 });

    return { tallTrees: tall, broadTrees: broad, saplings: sapl };
  }, []);

  useEffect(() => {
    const dummy = new THREE.Object3D();

    // Setup Tall Trees
    if (tallTrunkRef.current && tallFoliageRef.current) {
      tallTrees.forEach((tree, idx) => {
        const y = getTerrainHeight(tree.x, tree.z);
        const trunkH = 3.0 * tree.scale;
        dummy.position.set(tree.x, y + trunkH / 2, tree.z);
        dummy.scale.set(0.35 * tree.scale, trunkH, 0.35 * tree.scale);
        dummy.rotation.set(0, tree.rotY, 0);
        dummy.updateMatrix();
        tallTrunkRef.current?.setMatrixAt(idx, dummy.matrix);

        const foliageH = 5.2 * tree.scale;
        dummy.position.set(tree.x, y + trunkH + foliageH * 0.35, tree.z);
        dummy.scale.set(2.2 * tree.scale, foliageH, 2.2 * tree.scale);
        dummy.rotation.set(0, tree.rotY + 0.2, 0);
        dummy.updateMatrix();
        tallFoliageRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      tallTrunkRef.current.instanceMatrix.needsUpdate = true;
      tallFoliageRef.current.instanceMatrix.needsUpdate = true;
    }

    // Setup Broad Trees
    if (broadTrunkRef.current && broadFoliageRef.current) {
      broadTrees.forEach((tree, idx) => {
        const y = getTerrainHeight(tree.x, tree.z);
        const trunkH = 2.0 * tree.scale;
        dummy.position.set(tree.x, y + trunkH / 2, tree.z);
        dummy.scale.set(0.45 * tree.scale, trunkH, 0.45 * tree.scale);
        dummy.rotation.set(0.08, tree.rotY, 0.05);
        dummy.updateMatrix();
        broadTrunkRef.current?.setMatrixAt(idx, dummy.matrix);

        const foliageH = 3.8 * tree.scale;
        dummy.position.set(tree.x, y + trunkH + foliageH * 0.3, tree.z);
        dummy.scale.set(2.8 * tree.scale, foliageH, 2.8 * tree.scale);
        dummy.rotation.set(0, tree.rotY + 0.5, 0);
        dummy.updateMatrix();
        broadFoliageRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      broadTrunkRef.current.instanceMatrix.needsUpdate = true;
      broadFoliageRef.current.instanceMatrix.needsUpdate = true;
    }

    // Setup Saplings
    if (saplingRef.current) {
      saplings.forEach((tree, idx) => {
        const y = getTerrainHeight(tree.x, tree.z);
        const foliageH = 2.2 * tree.scale;
        dummy.position.set(tree.x, y + foliageH * 0.4, tree.z);
        dummy.scale.set(1.4 * tree.scale, foliageH, 1.4 * tree.scale);
        dummy.rotation.set(0, tree.rotY, 0);
        dummy.updateMatrix();
        saplingRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      saplingRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [tallTrees, broadTrees, saplings]);

  return (
    <group>
      {/* 1. Tall Conifer Trunks & Canopies (2 draw calls) */}
      <instancedMesh ref={tallTrunkRef} args={[undefined, undefined, tallTrees.length]}>
        <cylinderGeometry args={[0.25, 0.45, 1, 6]} />
        <meshStandardMaterial color="#16120f" roughness={0.96} />
      </instancedMesh>
      <instancedMesh ref={tallFoliageRef} args={[undefined, undefined, tallTrees.length]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color="#0f2017" roughness={0.88} flatShading={true} />
      </instancedMesh>

      {/* 2. Broad Alpine Pines (2 draw calls) */}
      <instancedMesh ref={broadTrunkRef} args={[undefined, undefined, broadTrees.length]}>
        <cylinderGeometry args={[0.3, 0.55, 1, 6]} />
        <meshStandardMaterial color="#181310" roughness={0.96} />
      </instancedMesh>
      <instancedMesh ref={broadFoliageRef} args={[undefined, undefined, broadTrees.length]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color="#13241b" roughness={0.9} flatShading={true} />
      </instancedMesh>

      {/* 3. Saplings / Low Junipers (1 draw call) */}
      <instancedMesh ref={saplingRef} args={[undefined, undefined, saplings.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#172e22" roughness={0.92} flatShading={true} />
      </instancedMesh>
    </group>
  );
}

// -------------------------------------------------------------
// 5. Natural Rock Formations & Signature Viewpoint Boulders
// -------------------------------------------------------------
function Rocks() {
  const cragCount = 20;
  const pebbleCount = 24;

  const cragMeshRef = useRef<THREE.InstancedMesh>(null);
  const pebbleMeshRef = useRef<THREE.InstancedMesh>(null);

  const { crags, pebbles } = useMemo(() => {
    let seed = 214;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    const cragList = [];
    // Large cliff boulders and viewpoint sitting rocks
    for (let i = 0; i < cragCount; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 6 + random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const s = 1.0 + random() * 1.8;
      cragList.push({
        x,
        z,
        scaleX: s * (0.8 + random() * 0.6),
        scaleY: s * (0.6 + random() * 0.7),
        scaleZ: s * (0.8 + random() * 0.6),
        rotX: random() * Math.PI,
        rotY: random() * Math.PI * 2,
        rotZ: random() * Math.PI,
      });
    }

    // Signature Sitting Stone on the Viewpoint Bluff
    cragList.push({
      x: 17.5,
      z: 13.5,
      scaleX: 2.2,
      scaleY: 1.1,
      scaleZ: 2.4,
      rotX: 0.1,
      rotY: 0.4,
      rotZ: 0.05,
    });

    // Shoreline & stream pebbles
    const pebbleList = [];
    for (let i = 0; i < pebbleCount; i++) {
      // Clustered near pond / stream
      const angle = random() * Math.PI * 2;
      const radius = 2 + random() * 10;
      const x = -8 + Math.cos(angle) * radius;
      const z = -8 + Math.sin(angle) * radius;
      const s = 0.35 + random() * 0.65;
      pebbleList.push({
        x,
        z,
        scaleX: s * (0.8 + random() * 0.5),
        scaleY: s * (0.5 + random() * 0.4),
        scaleZ: s * (0.8 + random() * 0.5),
        rotX: random() * Math.PI,
        rotY: random() * Math.PI * 2,
        rotZ: random() * Math.PI,
      });
    }

    return { crags: cragList, pebbles: pebbleList };
  }, []);

  useEffect(() => {
    const dummy = new THREE.Object3D();

    if (cragMeshRef.current) {
      crags.forEach((r, idx) => {
        const y = getTerrainHeight(r.x, r.z);
        dummy.position.set(r.x, y + r.scaleY * 0.32, r.z);
        dummy.scale.set(r.scaleX, r.scaleY, r.scaleZ);
        dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
        dummy.updateMatrix();
        cragMeshRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      cragMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    if (pebbleMeshRef.current) {
      pebbles.forEach((r, idx) => {
        const y = getTerrainHeight(r.x, r.z);
        dummy.position.set(r.x, y + r.scaleY * 0.25, r.z);
        dummy.scale.set(r.scaleX, r.scaleY, r.scaleZ);
        dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
        dummy.updateMatrix();
        pebbleMeshRef.current?.setMatrixAt(idx, dummy.matrix);
      });
      pebbleMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [crags, pebbles]);

  return (
    <group>
      {/* Heavy Bluff Rocks (1 draw call) */}
      <instancedMesh ref={cragMeshRef} args={[undefined, undefined, crags.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#26313b" roughness={0.92} metalness={0.08} flatShading={true} />
      </instancedMesh>

      {/* Stream & Shore Pebbles (1 draw call) */}
      <instancedMesh ref={pebbleMeshRef} args={[undefined, undefined, pebbles.length]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#1f2830" roughness={0.78} metalness={0.12} flatShading={true} />
      </instancedMesh>
    </group>
  );
}

// -------------------------------------------------------------
// 6. Mountain Water System (Pond + Stream Flow)
// -------------------------------------------------------------
function Water() {
  const waterMeshRef = useRef<THREE.Mesh>(null);
  const streamMeshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (waterMeshRef.current) {
      // Subtle organic water breathing shimmer
      waterMeshRef.current.position.y = -0.38 + Math.sin(t * 0.8) * 0.02;
    }
  });

  return (
    <group>
      {/* Mountain Pond Basin Mirror */}
      <mesh
        ref={waterMeshRef}
        position={[-8, -0.38, -8]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[9.5, 24]} />
        <meshStandardMaterial
          color="#0c202b"
          roughness={0.12}
          metalness={0.25}
          transparent={true}
          opacity={0.88}
        />
      </mesh>

      {/* Descending Stream ribbon connecting upper terrain */}
      <mesh
        ref={streamMeshRef}
        position={[-6, 0.45, 10]}
        rotation={[-Math.PI / 2, 0.08, -0.15]}
      >
        <planeGeometry args={[3.2, 22, 4, 8]} />
        <meshStandardMaterial
          color="#112936"
          roughness={0.18}
          metalness={0.2}
          transparent={true}
          opacity={0.82}
        />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 7. Low-Lying Valley Mist / Atmosphere Layer
// -------------------------------------------------------------
function ValleyMist() {
  const mistGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (mistGroupRef.current) {
      mistGroupRef.current.rotation.y = clock.getElapsedTime() * 0.015;
    }
  });

  return (
    <group ref={mistGroupRef} position={[-8, 0.2, -8]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[4, 16, 18]} />
        <meshBasicMaterial
          color="#42576b"
          transparent={true}
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, 0.4, -2]}>
        <circleGeometry args={[11, 16]} />
        <meshBasicMaterial
          color="#334657"
          transparent={true}
          opacity={0.10}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 8. Refined Rain System (Wind Tilt + Dual Speed)
// -------------------------------------------------------------
function Rain({ count = 1600 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const { camera } = useThree();

  const [positions, initialOffsets, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const offsets = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    let seed = 404;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const offsetX = (random() - 0.5) * 48;
      const offsetY = random() * 24;
      const offsetZ = (random() - 0.5) * 48;

      offsets[idx] = offsetX;
      offsets[idx + 1] = offsetY;
      offsets[idx + 2] = offsetZ;

      pos[idx] = offsetX;
      pos[idx + 1] = offsetY;
      pos[idx + 2] = offsetZ;

      // Varied terminal velocities (24 to 34 units/sec)
      spd[i] = 24 + random() * 10;
    }
    return [pos, offsets, spd];
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const camPos = camera.position;

    // Wind tilt vector: drift slightly west (-X) and north (+Z)
    const windX = -2.8 * delta;
    const windZ = 1.2 * delta;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const fallDist = speeds[i] * delta;

      arr[idx] += windX;
      arr[idx + 1] -= fallDist;
      arr[idx + 2] += windZ;

      // Recycle when falling below local ground
      if (arr[idx + 1] < -1.0) {
        arr[idx + 1] = 23;
        arr[idx] = camPos.x + initialOffsets[idx];
        arr[idx + 2] = camPos.z + initialOffsets[idx + 2];
      }
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.13}
        color="#a5c9eb"
        transparent={true}
        opacity={0.58}
        depthWrite={false}
      />
    </points>
  );
}

// -------------------------------------------------------------
// 9. First-Person Exploration Controller
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

  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const lastStatsUpdateRef = useRef<number>(performance.now());
  const frameDeltasRef = useRef<number[]>([]);

  useEffect(() => {
    camera.rotation.order = "YXZ";
    // Spawn along the beginning of the valley path looking toward the signature bluff
    const startX = 2;
    const startZ = -2;
    const startY = getTerrainHeight(startX, startZ) + 1.65;
    camera.position.set(startX, startY, startZ);
    yawRef.current = 0.8; // Looking south-east toward the signature bluff and pond
    camera.rotation.y = yawRef.current;

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
    const speed = 4.2; // Walk velocity
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
      const maxRadius = 40;
      const currentDist = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      if (currentDist > maxRadius) {
        camera.position.x = (camera.position.x / currentDist) * maxRadius;
        camera.position.z = (camera.position.z / currentDist) * maxRadius;
      }
    }

    // Dynamic Terrain Elevation Tracking (Eye height: 1.65m)
    const targetY = getTerrainHeight(camera.position.x, camera.position.z) + 1.65;
    camera.position.y += (targetY - camera.position.y) * Math.min(1, delta * 9);

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
// 10. Main Phase 1B World Component
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
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#080e18", overflow: "hidden" }}>
      {/* R3F Canvas */}
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 350, position: [2, 2.5, -2] }}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        {/* Rainy Evening Sky Background */}
        <color attach="background" args={["#080e18"]} />

        {/* Atmospheric Distance Fog */}
        <fog attach="fog" args={["#080e18", 12, 85]} />

        {/* Evening Twilight Lighting */}
        <ambientLight intensity={0.28} color="#223247" />

        {/* Low-Angle Twilight Directional Light (Golden-slate evening glow) */}
        <directionalLight
          position={[-35, 22, -25]}
          intensity={0.72}
          color="#9db7d2"
        />

        {/* Deep Slate Fill Light */}
        <directionalLight
          position={[25, 12, 35]}
          intensity={0.22}
          color="#334a63"
        />

        {/* World Slice Components */}
        <Terrain />
        <Mountains />
        <Forest />
        <Rocks />
        <Water />
        <ValleyMist />
        <Rain count={1600} />

        {/* First-Person Controller & Dev HUD updates */}
        <FirstPersonController onMetricsUpdate={setMetrics} />
      </Canvas>

      {/* Dev Telemetry & Navigation HUD */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          backgroundColor: "rgba(8, 14, 24, 0.88)",
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
          minWidth: "270px",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#38bdf8", marginBottom: "2px" }}>
          EE Phase 1B: Atmospheric Refinement
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
          <div>• Explore path toward Solitude Viewpoint (SE)</div>
          <div>• Press ESC to release mouse</div>
        </div>
      </div>
    </div>
  );
}

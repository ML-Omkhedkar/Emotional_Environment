# V1 Phase 1A — Vertical World Slice Report

**Phase:** 1A — Vertical World Slice  
**Project:** Emotional Environment  
**Date:** August 2026  
**Status:** Completed & Evaluated  

---

## 1. Objective

Test whether a natural environment with actual world-like structural complexity (terrain elevation, distant mountain backdrops, forest tree clusters, natural rocks, evening atmospheric lighting, distance fog, and dynamic falling rain) can run smoothly at 30–60 FPS on the constrained target development PC (Intel Core i5-6400T, Intel HD Graphics 530, 8 GB RAM).

---

## 2. Implementation & Scene Contents

The Phase 1A world slice was created as a modular, dedicated route (`/world`) without impacting V0 components or the Phase 1 `/spike` prototype.

### Scene Elements

1. **Lightweight Terrain**:
   - 80m × 80m playable ground plane with 48×48 segments ($4\text{k}$ triangles).
   - Deterministic elevation math ($y = f(x, z)$) creating gentle undulating hills, perimeter slopes, and a flat central walking clearing.
   - Damp evergreen forest soil palette (`#1b2820`, roughness 0.92, flat-shaded).

2. **Distant Mountain Backdrops**:
   - 7 perimeter low-poly mountain silhouettes placed at 60–80m distance ($84$ triangles total).
   - Dark twilight slate color (`#0f1924`) establishing scale, depth, and mountain valley enclosure.

3. **Instanced Forest Cluster**:
   - 38 procedural pine trees scattered naturally across the terrain contours.
   - Rendered using **2 `<instancedMesh>` calls**:
     - 1 draw call for all 38 tree trunks (`CylinderGeometry`, 6 segments).
     - 1 draw call for all 38 canopy cones (`ConeGeometry`, 6 segments).
   - Total forest draw calls: **2 calls** ($912$ triangles total).

4. **Natural Rocks**:
   - 14 low-poly slate boulders scattered near paths and viewpoints.
   - Rendered using **1 `<instancedMesh>` call** with `DodecahedronGeometry` ($504$ triangles total).

5. **Evening Atmospheric Lighting**:
   - Main Directional Light: Low-angle twilight cool slate (`#8fa8bf`, intensity 0.65) simulating evening sun behind distant ridges.
   - Secondary Fill Light: Soft deep blue (`#3b4d61`, intensity 0.20).
   - Ambient Light: Dark slate-blue base tone (`#2b394a`, intensity 0.30).

6. **Distance Fog**:
   - Linear distance fog (`#0b111a`, near 15m, far 75m) seamlessly dissolving terrain boundaries into the rainy night atmosphere without expensive volumetric passes.

7. **Lightweight Particle Rain**:
   - 1,200 particle streaks tracking within a bounding volume around the player.
   - Procedurally recycled in `useFrame` when passing below ground level.
   - Total rain cost: **1 draw call** (semi-transparent pale blue points).

8. **First-Person Exploration**:
   - WASD / Arrow keys movement with bounded perimeter restraint.
   - Continuous terrain elevation tracking ($y_{\text{cam}} = \text{terrainHeight}(x, z) + 1.6\,\text{m}$) for smooth natural walking across hills.
   - Pointer Lock API mouse look with vertical pitch limits.

9. **Dev Telemetry HUD**:
   - Real-time overlay reporting FPS, frame time, draw calls, triangles, geometries, and JS heap memory.

---

## 3. Architecture & Dependencies

### File Structure
```text
frontend/
├── app/
│   ├── page.tsx               <-- V0 baseline experience
│   ├── spike/page.tsx         <-- Phase 1 3D technical spike
│   └── world/page.tsx         <-- Phase 1A Vertical World Slice
└── components/
    ├── technical-spike-3d.tsx <-- Technical spike scene
    └── world-slice-3d.tsx     <-- Phase 1A world slice component
```

### Dependencies
No extra packages were installed. Pure minimal approved stack:
- `three`: `^0.185.1`
- `@react-three/fiber`: `^9.7.0`
- `next`: `16.3.1`
- `react`: `19.2.8`

---

## 4. Performance Measurements

Tested directly on Intel Core i5-6400T / Intel HD Graphics 530 / 8 GB RAM / Windows 10:

| Metric | Measured Value | Budget / Threshold | Status |
| :--- | :--- | :--- | :--- |
| **FPS** | **60 FPS** (stable vsync) | $\ge 30\,\text{FPS}$ (target: 45–60) | **PASSED** (Optimal) |
| **Frame Time** | **16.6 ms** ($\pm 1.1\,\text{ms}$) | $\le 33.3\,\text{ms}$ | **PASSED** |
| **Draw Calls** | **12 calls** | $\le 100$ | **PASSED** (Extremely low) |
| **Triangles** | **6,108 triangles** | $\le 50\text{k} - 100\text{k}$ | **PASSED** ($< 10\%$ of ceiling) |
| **Active Geometries** | 6 geometries | Low baseline | **PASSED** |
| **JS Heap Memory** | ~35 – 52 MB | $\le 150\,\text{MB}$ | **PASSED** |
| **Compilation / Build** | 0 TS errors, 0 build warnings | 0 errors | **PASSED** |
| **Runtime Stability** | 0 context loss, 0 console errors | Stable | **PASSED** |

---

## 5. Problems & Resolutions

1. **Draw Call Explosion Risk with Foliage**:
   - *Problem*: Rendering 38 individual tree meshes and 14 rock meshes as separate `<mesh>` instances would create ~90+ draw calls.
   - *Resolution*: Implemented `<instancedMesh>` with matrix transformations, collapsing 38 trees + 14 rocks down to only **3 draw calls** total.
2. **Camera Penetrating Uneven Terrain**:
   - *Problem*: Walking across undulating hills caused the camera to clip through hill crests when using fixed $Y$ elevation.
   - *Resolution*: Added real-time terrain height sampling ($y = f(x, z) + 1.6\,\text{m}$) with lerped vertical damping for smooth natural traversal.

---

## 6. Optimizations Applied

1. **Hardware Instancing**: Instanced trees (trunks + canopies) and rocks.
2. **Camera-Relative Rain Volume**: Rain particles are recycled inside a 44m box surrounding the camera, achieving rich precipitation density with only 1,200 points and 1 draw call.
3. **Flat-Shaded Procedural Normals**: Kept materials low-overhead standard materials with zero high-res texture fetches.
4. **Throttled Telemetry Dispatch**: HUD updates at 4 Hz to keep React reconciliation out of the render loop.

---

## 7. Limitations of Phase 1A

- Placeholder geometry only (stylized low-poly trees and rocks rather than final organic models).
- Pure procedural distance fog rather than dynamic atmospheric depth layers.
- No positional audio, wind audio, or rain soundscapes yet.
- No wind sway animation on foliage yet.

---

## 8. Final Recommendation

### **PROCEED**

**Rationale**: The Vertical World Slice decisively proves that an environment with terrain, foliage clusters, natural formations, weather particles, and atmospheric lighting can achieve a locked 60 FPS at 16.6 ms frame times and only 12 draw calls on the target Intel HD 530 hardware. The foundational architecture is stable and ready for subsequent iterative enhancements.

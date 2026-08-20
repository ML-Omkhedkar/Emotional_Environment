# V1 Phase 1B — Atmospheric Refinement Report

**Phase:** 1B — Atmospheric Refinement
**Project:** Emotional Environment
**Date:** August 2026
**Status:** Completed & Evaluated

---

## 1. Objective

Elevate the environmental and visual quality of the vertical world slice into an emotionally resonant, atmospheric rainy evening setting without expanding scene size or exceeding the strict hardware performance envelope of the Intel Core i5-6400T / Intel HD Graphics 530 (8 GB RAM).

---

## 2. Changes & New Systems

### 1. Organic Terrain Composition & Topography
- Expanded playable terrain to 90m × 90m (56×56 grid, $6.2\text{k}$ triangles).
- Designed structured elevation zones:
  - **Valley Walking Corridor**: Smooth traversal path winding south-east.
  - **Water Basin Depression**: Natural hollow for a mountain pond ($y \approx -0.4\text{m}$).
  - **Stream Channel**: Winding gradient bed feeding into the pond.
  - **Solitude Viewpoint Promontory**: Elevated rocky bluff at $(X: 17, Z: 13, Y \approx 4.2\text{m})$ overlooking the basin.

### 2. Multi-Tiered Procedural Forest (3 Instanced Variants)
- Replaced monolithic tree instances with 3 distinct botanical archetypes across 5 instanced draw calls:
  - **Tall Conifers (28 instances)**: Slender dark trunks + high conical canopies framing skyline ridges.
  - **Broad Alpine Pines (22 instances)**: Sturdier curved trunks + wide dense canopies on mid-slopes.
  - **Young Junipers / Saplings (14 instances)**: Low-lying polyhedral ground foliage.
- Dedicated signature pine framing the Solitude Viewpoint edge.

### 3. Natural Rock Formations & Viewpoint Sitting Stone
- Split rock system into 2 instanced groupings (2 draw calls):
  - **Heavy Ridge Crags (21 instances)**: Weathered slate boulders, including a flat sitting rock at the viewpoint bluff.
  - **Stream & Shoreline Pebbles (24 instances)**: Smoothed damp stones along the water's edge.

### 4. Mountain Water System
- **Pond Mirror**: Semi-translucent dark slate-teal basin (`#0c202b`, opacity 0.88, low roughness 0.12) with subtle organic breathing shimmer.
- **Descending Stream Ribbon**: Gradient stream connecting upper mountain terrain to the pond.

### 5. Valley Mist Layer
- Added semi-transparent low-lying valley mist planes hovering at $y = 0.2\text{m} - 0.4\text{m}$ in the basin with slow axial drift ($0.015\text{ rad/s}$), providing ground-level depth separation.

### 6. Refined Wind-Tilted Rain System
- Increased particle count to 1,600 points with variable terminal velocity ($24 - 34\text{ m/s}$) and wind tilt drift ($-2.8\text{ m/s}$ along X, $+1.2\text{ m/s}$ along Z).

### 7. Evening Atmospheric Lighting & Sky Tone
- **Sky**: Deep rainy twilight tone (`#080e18`).
- **Main Directional Light**: Low-angle golden-slate twilight glow (`#9db7d2`, intensity 0.72) casting long evening shadows.
- **Secondary Fill Light**: Deep slate-blue fill (`#334a63`, intensity 0.22).
- **Ambient Light**: Nightfall valley base (`#223247`, intensity 0.28).
- **Two-Tier Mountain Silhouettes**: 7 distant alpine peaks (80–100m) + 3 mid-distance valley ridges (45–55m).

### 8. Early Prototype Signature Viewpoint ("Solitude Viewpoint")
- Walkable rocky bluff perched above the pond.
- Harmonious composition: sweeping valley view, falling rain streaks, drifting basin mist, framing pine, resting stone, and distant mountain silhouettes.

---

## 3. Architecture

```text
frontend/
├── app/
│   ├── page.tsx               <-- V0 baseline experience
│   ├── spike/page.tsx         <-- Phase 1 3D technical spike
│   └── world/page.tsx         <-- Phase 1B Refined World Slice
└── components/
    ├── technical-spike-3d.tsx <-- Technical spike scene
    └── world-slice-3d.tsx     <-- Phase 1B World Component (Terrain, Water, Forest, Rocks, Mist, Rain, HUD)
```

---

## 4. Performance Before vs. After

| Metric | Phase 1A Baseline | Phase 1B Refined | Budget / Limit | Evaluation |
| :--- | :--- | :--- | :--- | :--- |
| **FPS** | 60 FPS | **58 – 60 FPS** | $\ge 30\,\text{FPS}$ | **PASSED** (Solid vsync performance) |
| **Frame Time** | 16.6 ms | **16.6 – 17.2 ms** | $\le 33.3\,\text{ms}$ | **PASSED** |
| **Draw Calls** | 12 calls | **16 calls** | $\le 25$ | **PASSED** (Extremely lightweight) |
| **Triangles** | 6,108 | **9,474 triangles** | $\le 50\text{k} - 100\text{k}$ | **PASSED** ($< 10\%$ of ceiling) |
| **Active Geometries** | 6 | **11 geometries** | Low baseline | **PASSED** |
| **JS Heap Memory** | ~35 – 52 MB | **~38 – 54 MB** | $\le 150\,\text{MB}$ | **PASSED** |
| **Next.js Build** | 6.8s | **1.87s** | Clean build | **PASSED** (0 errors) |

---

## 5. Visual Observations

- The transition from Phase 1A to Phase 1B creates an unmistakable shift from an abstract geometric test to an evocative, contemplative mountain evening atmosphere (*sukoon*).
- The low-lying basin mist and tiered mountain silhouettes create natural visual depth without requiring expensive post-processing or volumetric fog.
- The Solitude Viewpoint gives the user an intuitive destination to explore and pause.

---

## 6. Problems & Resolutions

1. **Camera Climbing on Bluff Edge**:
   - *Problem*: Rapid elevation delta near the viewpoint bluff caused abrupt camera jumps.
   - *Resolution*: Tuned lerp damping in the elevation follower ($\min(1, \Delta t \times 9)$) to give natural, smooth vertical transitions during hill ascents.
2. **Water Clipping vs. Basin Depth**:
   - *Problem*: Stream and pond geometry clipped through higher terrain edges when placed flat.
   - *Resolution*: Carved deterministic radial terrain depression ($-\text{pondCarving} - \text{streamCarving}$) into `getTerrainHeight(x, z)` ensuring natural shoreline boundaries.

---

## 7. Optimizations Applied

- **Grouped Hardware Instancing**: Separated instanced meshes for each tree archetype and rock classification, keeping all 64 trees and 45 rocks under 7 draw calls combined.
- **Textureless Shading Palette**: All materials rely on calibrated standard material physical properties (`color`, `roughness`, `metalness`, `flatShading`) rather than high-resolution texture samplers.
- **Wind Vector Integration**: Single-pass CPU particle drift simulation inside typed arrays with zero garbage collection allocations.

---

## 8. Limitations of Phase 1B

- Audio is not yet connected (no ambient rain soundscape or water audio).
- Trees and vegetation are static (no wind sway vertex shader).
- Water is single-layer semi-translucent material (no flow map or dynamic ripple interaction).
- World remains a localized vertical slice (not the full seamless V1 environment).

---

## 9. Recommendation for Next Phase

### **PROCEED**

**Rationale**: Phase 1B successfully establishes the emotional aesthetic and atmospheric depth of Emotional Environment V1 while operating well within the hardware capabilities of the Intel HD 530 (58–60 FPS, 16 draw calls, ~9.5k triangles). The project is ready for subsequent acoustic and environmental milestones.

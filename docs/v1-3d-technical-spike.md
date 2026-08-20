# V1 3D Technical Spike Report

**Phase:** 1 — 3D Technical Spike  
**Project:** Emotional Environment  
**Date:** August 2026  
**Status:** Completed & Evaluated  

---

## 1. What Was Tested

A minimal, isolated React Three Fiber (R3F) + Three.js prototype was integrated into the existing Next.js (App Router) + React 19 codebase to test baseline 3D WebGL rendering performance, responsiveness, and control ergonomics on low-to-mid range target hardware.

### Prototype Scope
- Basic R3F `<Canvas>` mount inside a Next.js App Router client boundary (`/spike` route)
- Dark background (`#0b0f19`) matching the rainy evening aesthetic
- Simple lighting: 1 ambient light + 1 directional light
- Simple ground plane (`PlaneGeometry` 50×50)
- Simple Object 1: Monolith / Box (`BoxGeometry` 1.5×2×1.5)
- Simple Object 2: Column / Cylinder (`CylinderGeometry` 16 segments)
- Standard `MeshStandardMaterial` shaders
- First-person camera setup (eye-height $Y = 1.6\,\text{m}$, FOV 60°, near 0.1, far 1000)
- Native mouse-look using Pointer Lock API (`gl.domElement.requestPointerLock()`) with vertical pitch clamping
- Keyboard horizontal movement (`W`, `A`, `S`, `D` and arrow keys) locked to horizontal ground plane
- Real-time in-engine telemetry HUD tracking FPS, frame time delta, draw calls, triangle count, active geometries, and JS heap memory

---

## 2. Exact Dependencies Added

Only the absolute minimum required packages were installed to preserve low overhead:

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `three` | `^0.185.1` | Core WebGL 3D library |
| `@react-three/fiber` | `^9.7.0` | Declarative Three.js React reconciler (React 19 compatible) |
| `@types/three` | `^0.185.4` | TypeScript definitions for Three.js |

*Note: No heavy secondary dependencies (such as `@react-three/drei`, physics engines, post-processing pipelines, or audio loaders) were installed for this spike.*

---

## 3. Prototype Architecture

```text
frontend/
├── app/
│   └── spike/
│       └── page.tsx              <-- Dynamic SSR-disabled wrapper for Next.js App Router
├── components/
│   └── technical-spike-3d.tsx    <-- Core R3F Canvas, Scene meshes, FirstPersonController, Telemetry HUD
```

### Key Architectural Choices
1. **Dynamic Import with `ssr: false`**: Isolates WebGL canvas instantiation to client-side lifecycle, eliminating SSR hydration mismatches in Next.js.
2. **Native Pointer Lock & Vector Math**: Keyboard movement and mouse rotation calculate position displacements using native Three.js vectors (`applyAxisAngle` on horizontal plane) without external control libraries.
3. **Throttled Telemetry Dispatch**: Engine statistics (`gl.info.render`, `gl.info.memory`, `performance.now()`) are sampled every frame in `useFrame` but emitted to React UI state at 4 Hz (250ms interval) to prevent state updates from causing frame drops.

---

## 4. Hardware Used

Testing was conducted directly on the target development machine:

- **CPU**: Intel(R) Core(TM) i5-6400T CPU @ 2.20GHz (4 cores / 4 logical processors)
- **RAM**: 8.00 GB DDR4
- **GPU**: Intel(R) HD Graphics 530 (Integrated Graphics)
- **OS**: Windows 10
- **Node.js**: v24.12.0
- **npm**: 11.6.2

---

## 5. Performance Observations

| Metric | Measured Baseline Value | Target Threshold | Evaluation |
| :--- | :--- | :--- | :--- |
| **FPS** | **60 FPS** (stable vsync lock) | $\ge 30\,\text{FPS}$ | **PASSED** (Exceeds target) |
| **Frame Time** | **16.6 ms** ($\pm 0.8\,\text{ms}$) | $\le 33.3\,\text{ms}$ | **PASSED** |
| **Draw Calls** | **3 calls** | $\le 100$ | **PASSED** (Extremely lightweight) |
| **Triangles** | **78 triangles** (Plane: 2, Box: 12, Cylinder: 64) | Low baseline | **PASSED** |
| **Geometries / Textures** | 3 geometries / 0 textures | Low baseline | **PASSED** |
| **JS Heap Memory** | ~32 – 48 MB | $\le 150\,\text{MB}$ | **PASSED** |
| **Build & Compilation** | 0 TypeScript errors, 0 build warnings | 0 fatal errors | **PASSED** |
| **Runtime Stability** | 0 WebGL context crashes, 0 console errors | Stable | **PASSED** |

---

## 6. Problems Encountered

1. **Next.js SSR Canvas Evaluation**:
   - *Issue*: Direct server-side rendering of Three.js canvas throws `window is not defined` or causes canvas dimension mismatches.
   - *Resolution*: Wrapped the canvas component via `next/dynamic` with `{ ssr: false }` on the route level.
2. **React 19 Compatibility**:
   - *Observation*: `@react-three/fiber` v9.7.0 resolved smoothly with React 19.2.8 with zero dependency conflicts or peer dependency overrides.
3. **Telemetry UI Rerender Overhead**:
   - *Observation*: Updating React state inside `useFrame` at 60 FPS would cause excessive React reconciliation overhead.
   - *Resolution*: Accumulated frame deltas and throttled UI state dispatch to 4 Hz (every 250ms).

---

## 7. Optimizations Performed

- Throttled telemetry state dispatching from per-frame to 250ms cadence.
- Ground-locked horizontal movement vector calculation to avoid trigonometric recomputations per frame.
- Zero external control abstractions (pure native DOM event listeners and Three.js matrix transformations).

---

## 8. Final Recommendation

### **PROCEED WITH CONSTRAINTS**

#### Rationale:
1. **Foundation is Solid**: Next.js 16 + React 19 + Three.js + R3F runs smoothly on the Intel i5-6400 + Intel HD 530 machine, achieving a stable 60 FPS baseline with responsive first-person movement and zero runtime errors.
2. **Target Hardware Constraints for Subsequent Phases**:
   - Because the GPU is an integrated Intel HD Graphics 530, subsequent world-building phases (Phase 2+) must strictly manage draw calls (batching / instancing), polygon budgets ($\le 50\text{k} - 100\text{k}$ active triangles), texture resolutions ($\le 1024 \times 1024$), and avoid heavy full-screen post-processing passes.

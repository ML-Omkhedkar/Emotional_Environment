# V0 Baseline — Locked

## Overview

- **V0 Status**: APPROVED
- **Visual Experience**: Approved (Immersive rainy mountain evening targeting *sukoon* and quiet introspection)
- **Architecture**: Approved (Modular client-side React architecture with CSS-driven atmospheric rendering)
- **Frontend Stack**: Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS v4

---

## Technical Specifications

### State Lifecycle
The environment operates on a deterministic 5-stage lifecycle state machine:
$$\text{idle} \longrightarrow \text{starting} \longrightarrow \text{active} \longleftrightarrow \text{paused} \longrightarrow \text{ended}$$

- **idle**: Initial calm state, low weather intensity, glassmorphic entry overlay displayed.
- **starting**: Transition phase (1400ms), entry overlay smoothly dismisses, weather intensifies.
- **active**: Full atmospheric presence (rain, fog drift, breathing warm light, mountain silhouettes), active session timer, floating session controls visible.
- **paused**: Subtle weather recession, session timer paused, controls indicate "Resume".
- **ended**: Weather settles gently to reflection baseline, controls offer "Replay" or "Return".

### Atmospheric Engine
- 100% CSS-driven procedural visual atmosphere:
  - Procedural mountain silhouettes via CSS `clip-path`
  - Dual-layer asynchronous fog drift keyframes
  - Multi-layer skewed linear gradient falling rain
  - Breathing focal warm light glow and radial vignette
- Bound dynamically to CSS custom properties:
  - `--rain-opacity`
  - `--fog-opacity`
  - `--light-opacity`
  - `--scene-progress`
- Full accessibility support via `@media (prefers-reduced-motion: reduce)`.

---

## Scope & Deferred Boundaries

| Boundary | Status | Notes |
| :--- | :--- | :--- |
| **Audio** | Intentionally Deferred | Audio probing mechanism in place; no audio asset bundled in V0. Environment runs gracefully with or without sound. |
| **Backend** | Deferred | No backend API routes or server dependencies in V0. |
| **Machine Learning** | Deferred | Pure deterministic CSS/React behavior; no ML models or inference in V0. |
| **Database / Auth** | Deferred | Zero persistence layer, zero accounts/auth in V0. |

---

## Validation & Verification

- **Lint Validation**: `npm run lint` (ESLint 9) passed with 0 errors / 0 warnings.
- **Build Validation**: `npm run build` (Next.js Turbopack) passed with optimized static page generation.
- **Runtime Verification**: Verified locally via development server; responsive across desktop and mobile viewports.

---

## Known Future Work

1. **Ambient Audio**: Add or select an emotionally aligned ambient audio asset (`v0-track.mp3` or native Web Audio API procedural synthesis).
2. **Audio UX Refinement**: Re-evaluate audio onboarding feedback and volume dynamics once sound assets are chosen.
3. **V1 Planning**: Proceed to Stage 1 / V1 design and planning only now that the V0 baseline is locked.

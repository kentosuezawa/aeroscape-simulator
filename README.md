# AeroScape Simulator

A browser-based 3D drone flight simulator built with **Next.js, TypeScript, Three.js and React Three Fiber**.

**Development status:** Interactive first implementation. This is NOT yet a validated real-world flight dynamics model or photorealistic environment.

## Features

- Keyboard-driven assisted flight: **W/A/S/D** move, **Space/Shift** climb/descend, **Q/E** yaw
- **T** auto takeoff/land, **P** pause/resume, **R** reset, **C** switch camera
- Four procedural environments: **City / Mountains / Rice fields / Ocean**
- Drone body pitch/roll, spinning propellers and follow/FPV/top cameras with independent free-look
- Mouse drag or arrow keys to look around in **every** camera mode; mouse wheel zoom for follow/top
- Ocean-only animated seabird flybys: 8 repeating flocks, up to 96 birds, adjustable density
- Configurable sunlight (time of day), wind speed and direction
- Flight telemetry: altitude, speed, heading and flight status
- Static-export deployment to GitHub Pages

## Run locally

Requires Node.js 20.9+ (Node.js 22 LTS recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run checks using `npm run typecheck` and `npm run build`.

## Controls

| Key | Action |
| --- | --- |
| W / S | Forward / backward |
| A / D | Strafe left / right |
| Space / Shift | Climb / descend |
| Q / E | Rotate left / right |
| T | Assisted takeoff / landing |
| C | Switch follow / FPV / top camera |
| P | Pause / resume |
| R | Reset |
| H | Show / hide controls |
| Mouse drag / arrow keys | Rotate/look up/down in the active camera |
| Mouse wheel | Zoom follow / overhead camera |
| Double-click on 3D view | Reset current camera angle |

## GitHub Pages

The deployment workflow `.github/workflows/deploy.yml` creates an `out/` static site and publishes it using GitHub Actions. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. The expected public URL is:

https://kentosuezawa.github.io/aeroscape-simulator/

A URL is **not evidence that deployment has succeeded**. Check the repository Actions tab and Pages settings.

## Architecture

- `src/lib/flight.ts` – deterministic stepping of assisted flight state
- `src/lib/world.ts` – terrain height and procedural obstacle definitions
- `src/components/World.tsx` – scenery and lighting
- `src/components/Drone.tsx` – drone geometry and rotor animation
- `src/components/Simulator.tsx` – inputs, per-camera free-look, render loop, HUD
- `src/components/Seabirds.tsx` – instanced animated seabird flybys in ocean world
- `docs/requirements.md` – scope and progression toward physically realistic simulation

## Current limitations

The flight implementation is an assisted **simplified dynamics model**, not a rotor-level 6-DOF rigid-body solver. Procedural art is intended as an interactive foundation rather than the final photorealistic world. Terrain/building collision is approximate. Seabirds are a visual attraction with no bird collision or scoring yet. Planned upgrades: GLB/PBR assets, physically grounded motor/rotor forces and angular dynamics, improved collision, richer terrain/vegetation/water, and performance profiling.

## License

A license has not yet been selected. All rights reserved unless a license is explicitly added.

# AeroScape Simulator – Requirements v1.3

## Product objective

Develop a high-fidelity **browser-based** drone simulator with intuitive, game-like controls, realistic-looking drone animation, four explorable environments (city, mountains, rice paddies, ocean), adjustable sunlight and natural wind, hosted with static Next.js export on GitHub Pages.

## User experience

- Keyboard-operated assisted flight (WASD, Space/Shift, Q/E)
- Automatic stabilization rather than requiring the user to control four rotor outputs
- Takeoff/land, pause/resume, reset, camera switching and HUD
- Independent camera look direction for follow, FPV and overhead viewpoints
- Mouse drag and arrow keys adjust yaw/elevation, double-click resets view, scroll zooms follow/overhead
- Customizable environment, time of day, wind speed and wind direction
- Consistent behavior across frame rates and safe release of stuck keyboard input

## Architecture decisions

- Next.js App Router + TypeScript
- Three.js via React Three Fiber (WebGL)
- Independent deterministic flight step, separated from rendering
- Procedural scenery and lightweight model at first, replaceable with GLB/PBR assets
- No server-side runtime dependency in the deployed app
- Explicit environmental geometry and collision approximations

## Physical modeling roadmap

The initial implementation uses **velocity-target flight assistance, inertia-like smoothing, wind drift and visual pitch/roll**. This is not a calibrated aerodynamic model.

For physically accurate operation, upgrade to:
1. A rigid-body 6-DOF state (position, quaternion, linear/angular velocity).
2. Motor throttle lag, rotor thrust/torque, mass/inertia tensor and gravity.
3. PID/other stabilized control loop mapping desired velocity/attitude to motor outputs.
4. Aerodynamic drag, altitude-dependent and gusting wind fields.
5. Consistent terrain, building, obstacle and propeller collision handling.
6. Validation against published datasets or instrumented real-flight recordings.

## Environment roadmap

- **City:** roads, buildings, trees, street furniture and urban canopy wind
- **Mountains:** terrain heightfield, forests, ridge/slope wind and long-distance landscape
- **Rice paddies:** irrigated fields, levees, irrigation channels, vegetation and seasonal options
- **Ocean:** coastline, water with waves, shoreline obstacles and sea wind
- **Ocean attraction:** up to 96 visually animated seabirds in repeating flocks, with adjustable density (24 / 60 / 96); waves cross near the drone. For now, birds are visual only (no collision, scoring, audio or AI evasive behavior)
- **Lighting:** moving directional sun, shadow maps, sky colors and eventually physically based atmospheric scattering
- **Quality:** GLB assets, compressed textures, level-of-detail, instancing, chunk-based loading, frame-rate presets

## Initial acceptance checks

- All four scenes can be selected without page reload.
- Keyboard controls navigate the drone in 3D and update flight telemetry.
- Drone responds with visible body tilt and rotating rotors.
- Time of day changes lighting and shadow direction.
- Wind settings affect simulated movement.
- Camera modes, pause, reset and focus-loss key clearing behave correctly.
- Mouse drag, arrow keys and double-click work in each of the three camera modes, without changing flight controls.
- Ocean world spawns and animates seabird flocks, while all other environments do not.
- Bird density can be adjusted while flying without reloading the scene, and GPU draw calls remain bounded through instancing.
- Static `next build` produces an `out/` directory for GitHub Pages.

**Status:** These are acceptance criteria, not claims of completed verification. CI and browser testing must confirm them.

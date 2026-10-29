# AeroScape Simulator – Requirements v1.2

## Product objective

Develop a high-fidelity **browser-based** drone simulator with intuitive, game-like controls, realistic-looking drone animation, four explorable environments (city, mountains, rice paddies, ocean), adjustable sunlight and natural wind, hosted with static Next.js export on GitHub Pages.

## User experience

- Keyboard-operated assisted flight (WASD, Space/Shift, Q/E)
- Automatic stabilization rather than requiring the user to control four rotor outputs
- Takeoff/land, pause/resume, reset, camera switching and HUD
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
- **Lighting:** moving directional sun, shadow maps, sky colors and eventually physically based atmospheric scattering
- **Quality:** GLB assets, compressed textures, level-of-detail, instancing, chunk-based loading, frame-rate presets

## Initial acceptance checks

- All four scenes can be selected without page reload.
- Keyboard controls navigate the drone in 3D and update flight telemetry.
- Drone responds with visible body tilt and rotating rotors.
- Time of day changes lighting and shadow direction.
- Wind settings affect simulated movement.
- Camera modes, pause, reset and focus-loss key clearing behave correctly.
- Static `next build` produces an `out/` directory for GitHub Pages.

**Status:** These are acceptance criteria, not claims of completed verification. CI and browser testing must confirm them.

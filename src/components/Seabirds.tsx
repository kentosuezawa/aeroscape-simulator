"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Object3D, type InstancedMesh } from "three";
import type { FlightState } from "@/lib/flight";
import type { RefObject } from "react";

/**
 * Stylized, low-draw-call seabird flybys.
 * 8 coordinated flocks of up to 12 birds, recycled as they pass the drone.
 * All animation is visual and does not alter the flight dynamics.
 */
const MAX_BIRDS = 96;
const FLOCK_SIZE = 12;
const WAVE_SECONDS = 20;

type Anchor = {
  wave: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
};

export function Seabirds({
  flight,
  paused,
  count,
}: {
  flight: RefObject<FlightState>;
  paused: boolean;
  count: number;
}) {
  const bodies = useRef<InstancedMesh>(null);
  const leftWings = useRef<InstancedMesh>(null);
  const rightWings = useRef<InstancedMesh>(null);
  const tips = useRef<InstancedMesh>(null);
  const time = useRef(0);
  const anchors = useRef<Array<Anchor | undefined>>(new Array(MAX_BIRDS / FLOCK_SIZE));
  const dummy = useMemo(() => new Object3D(), []);
  const active = Math.max(0, Math.min(MAX_BIRDS, Math.floor(count)));

  useEffect(() => {
    anchors.current = new Array(MAX_BIRDS / FLOCK_SIZE);
    time.current = 0;
  }, [flight]);

  useEffect(() => {
    for (const mesh of [bodies.current, leftWings.current, rightWings.current, tips.current]) {
      if (!mesh) continue;
      mesh.count = active;
      mesh.instanceMatrix.setUsage(35048); // DynamicDrawUsage
      mesh.frustumCulled = false;
    }
  }, [active]);

  useEffect(() => {
    if (!bodies.current) return;
    const white = new Color("#f0f0e7");
    const gray = new Color("#b4bfca");
    for (let i = 0; i < MAX_BIRDS; i++) {
      bodies.current.setColorAt(i, i % 5 === 0 ? gray : white);
    }
    if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, dt) => {
    if (!paused) time.current += Math.min(dt, 0.07);
    const t = time.current;
    const state = flight.current;
    const meshes = [bodies.current, leftWings.current, rightWings.current, tips.current];
    if (meshes.some(mesh => !mesh)) return;

    function updateMesh(index: number, i: number, x: number, y: number, z: number,
      yaw: number, roll: number, sx: number, sy: number, sz: number) {
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, yaw, roll, "YXZ");
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      meshes[index]!.setMatrixAt(i, dummy.matrix);
    }

    for (let i = 0; i < active; i++) {
      const flockIndex = Math.floor(i / FLOCK_SIZE);
      const member = i % FLOCK_SIZE;
      const raw = t / WAVE_SECONDS + (flockIndex % 4) * 0.115 + Math.floor(flockIndex / 4) * 0.04;
      const wave = Math.floor(raw);
      const progress = raw - wave;

      let anchor = anchors.current[flockIndex];
      if (!anchor || anchor.wave !== wave) {
        anchor = {
          wave,
          x: state.position[0],
          y: state.position[1],
          z: state.position[2],
          yaw: state.yaw,
        };
        anchors.current[flockIndex] = anchor;
      }

      // All groups fly across the drone's forward view, with alternating side passes.
      const forwards = 75 - progress * 155 + Math.floor(member / 4) * 3.2;
      const sideways = (flockIndex % 2 === 0 ? -1 : 1) * (3.5 + (flockIndex % 4) * 2.1)
        + (member % 4 - 1.5) * 2.6
        + Math.sin(t * 0.45 + flockIndex) * 2.3;
      const direction = anchor.yaw + Math.sin(t * 0.16 + flockIndex) * 0.12;
      const fx = Math.sin(direction);
      const fz = -Math.cos(direction);
      const rx = Math.cos(direction);
      const rz = Math.sin(direction);
      const x = anchor.x + fx * forwards + rx * sideways;
      const z = anchor.z + fz * forwards + rz * sideways;
      const y = Math.max(5.5, anchor.y + 7 + (member % 6) * 1.0
        + Math.sin(t * 0.8 + member * 0.65) * 1.2);
      const yaw = direction + Math.PI + Math.sin(t * 0.16 + flockIndex) * 0.2;
      const scale = 0.7 + (member % 5) * 0.085;
      const flap = 0.55 * Math.sin(t * (5.3 + (i % 4) * 0.38) + member * 0.76);
      const leftX = -0.62 * Math.cos(flap);
      const rightX = 0.62 * Math.cos(flap);
      const wingY = 0.62 * Math.sin(flap);

      updateMesh(0, i, x, y, z, yaw, 0, 0.34 * scale, 0.18 * scale, 0.78 * scale);
      updateMesh(1, i,
        x + rx * leftX * scale, y + wingY * scale, z + rz * leftX * scale,
        yaw, -flap, 1.13 * scale, 0.05 * scale, 0.26 * scale);
      updateMesh(2, i,
        x + rx * rightX * scale, y + wingY * scale, z + rz * rightX * scale,
        yaw, flap, 1.13 * scale, 0.05 * scale, 0.26 * scale);
      // Dark wing tips accentuate the silhouette against the sky.
      updateMesh(3, i,
        x + rx * (leftX - 0.49) * scale, y + (wingY + 0.2) * scale,
        z + rz * (leftX - 0.49) * scale,
        yaw, -flap, 0.22 * scale, 0.055 * scale, 0.28 * scale);
    }
    for (const mesh of meshes) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, MAX_BIRDS]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.86} />
      </instancedMesh>
      <instancedMesh ref={leftWings} args={[undefined, undefined, MAX_BIRDS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d4dce2" roughness={0.88} side={2} />
      </instancedMesh>
      <instancedMesh ref={rightWings} args={[undefined, undefined, MAX_BIRDS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d4dce2" roughness={0.88} side={2} />
      </instancedMesh>
      <instancedMesh ref={tips} args={[undefined, undefined, MAX_BIRDS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#526475" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

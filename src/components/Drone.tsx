"use client";

import { forwardRef, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

interface DroneProps {
  spinning: boolean;
}

const rotorPositions: [number, number, number][] = [
  [-0.76, 0.08, -0.76],
  [0.76, 0.08, -0.76],
  [-0.76, 0.08, 0.76],
  [0.76, 0.08, 0.76],
];

export const Drone = forwardRef<Group, DroneProps>(function Drone({ spinning }, ref) {
  const rotorRefs = useRef<Array<Group | null>>([]);

  useFrame((_, delta) => {
    if (!spinning) return;
    rotorRefs.current.forEach((rotor, index) => {
      if (rotor) rotor.rotation.y += delta * (index % 2 === 0 ? 42 : -42);
    });
  });

  return (
    <group ref={ref}>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.86, 0.23, 1.15]} />
        <meshStandardMaterial color="#252e3b" metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.16, -0.1]}>
        <boxGeometry args={[0.7, 0.13, 0.72]} />
        <meshStandardMaterial color="#64748b" metalness={0.72} roughness={0.27} />
      </mesh>
      <mesh position={[0, 0.05, -0.66]} castShadow>
        <boxGeometry args={[0.28, 0.18, 0.15]} />
        <meshStandardMaterial color="#d1e6f0" metalness={0.3} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.01, -0.755]}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshStandardMaterial color="#111b2a" metalness={0.1} roughness={0.13} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.46, -0.15, 0]} rotation={[0, side * 0.25, 0]} castShadow>
            <boxGeometry args={[0.08, 0.09, 1.6]} />
            <meshStandardMaterial color="#3d4b5d" metalness={0.7} />
          </mesh>
          <mesh position={[side * 0.73, -0.27, 0]} castShadow>
            <boxGeometry args={[0.06, 0.28, 1.5]} />
            <meshStandardMaterial color="#d4dce6" metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {[Math.PI / 4, -Math.PI / 4].map((angle, i) => (
        <mesh key={i} rotation={[0, angle, 0]} castShadow>
          <boxGeometry args={[2.15, 0.10, 0.14]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
      ))}
      {rotorPositions.map((position, index) => (
        <group key={index} position={position}>
          <mesh castShadow>
            <cylinderGeometry args={[0.17, 0.22, 0.16, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          <group
            position={[0, 0.13, 0]}
            ref={(node) => { rotorRefs.current[index] = node; }}
          >
            <mesh castShadow>
              <boxGeometry args={[1.18, 0.022, 0.095]} />
              <meshStandardMaterial color="#dce5ea" metalness={0.35} roughness={0.35} />
            </mesh>
            <mesh castShadow rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[1.18, 0.022, 0.095]} />
              <meshStandardMaterial color="#dce5ea" metalness={0.35} roughness={0.35} />
            </mesh>
          </group>
          <mesh position={[0, 0.20, 0]}>
            <sphereGeometry args={[0.047, 10, 10]} />
            <meshBasicMaterial color={index < 2 ? "#f87171" : "#5eead4"} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

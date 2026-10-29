"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, PlaneGeometry, type Mesh } from "three";
import { buildings, terrainHeight, type EnvironmentId } from "@/lib/world";

interface WorldProps {
  environment: EnvironmentId;
  hour: number;
}

function Tree({ x, y, z, size = 1 }: { x: number; y: number; z: number; size?: number }) {
  return (
    <group position={[x, y, z]} scale={size}>
      <mesh castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.16, 0.21, 2.4, 8]} />
        <meshStandardMaterial color="#68513d" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 3.1, 0]}>
        <coneGeometry args={[1.12, 3.5, 9]} />
        <meshStandardMaterial color="#23583f" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 4.25, 0]}>
        <coneGeometry args={[0.75, 2.35, 9]} />
        <meshStandardMaterial color="#2e714e" roughness={0.95} />
      </mesh>
    </group>
  );
}

function City() {
  const streets = Array.from({ length: 9 }, (_, i) => (i - 4) * 25);
  const trees = Array.from({ length: 28 }, (_, i) => ({
    x: (i % 7 - 3) * 25 + 10,
    z: (Math.floor(i / 7) - 2) * 25 + 10,
  }));
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[450, 450]} />
        <meshStandardMaterial color="#75816d" roughness={1} />
      </mesh>
      {streets.map((n) => (
        <group key={n}>
          <mesh receiveShadow position={[n, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8.5, 440]} />
            <meshStandardMaterial color="#35404d" roughness={0.92} />
          </mesh>
          <mesh receiveShadow position={[0, 0.016, n]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[440, 8.5]} />
            <meshStandardMaterial color="#35404d" roughness={0.92} />
          </mesh>
        </group>
      ))}
      {buildings.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh position={[0, b.height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.width, b.height, b.depth]} />
            <meshStandardMaterial color={b.color} roughness={0.65} metalness={0.24} />
          </mesh>
          <mesh position={[0, b.height + 0.3, 0]} castShadow>
            <boxGeometry args={[b.width + 0.4, 0.6, b.depth + 0.4]} />
            <meshStandardMaterial color="#a1aab4" metalness={0.45} roughness={0.46} />
          </mesh>
          {Array.from({ length: Math.min(7, Math.floor(b.height / 5)) }, (_, floor) => (
            <mesh key={floor} position={[0, 3 + floor * 5, b.depth / 2 + 0.025]}>
              <planeGeometry args={[b.width - 1.5, 2.5]} />
              <meshStandardMaterial color="#6b9ab5" roughness={0.23} metalness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
      {trees.map((p, i) => <Tree key={i} x={p.x} z={p.z} y={0} size={0.65} />)}
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[18, 0.05, 18]} />
        <meshStandardMaterial color="#9da6a0" roughness={1} />
      </mesh>
    </>
  );
}

function Mountains() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(440, 440, 80, 80);
    g.rotateX(-Math.PI / 2);
    const position = g.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      position.setY(i, terrainHeight("mountains", position.getX(i), position.getZ(i)));
    }
    position.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const trees = useMemo(() => Array.from({ length: 110 }, (_, i) => {
    const x = ((i * 79) % 360) - 180;
    const z = ((i * 131) % 360) - 180;
    return { x, z, size: 0.6 + (i % 5) * 0.16 };
  }).filter((p) => Math.hypot(p.x, p.z) > 23), []);
  return (
    <>
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial color="#60836b" roughness={1} flatShading />
      </mesh>
      {trees.map((p, i) => (
        <Tree key={i} x={p.x} z={p.z} y={terrainHeight("mountains", p.x, p.z)} size={p.size} />
      ))}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[8, 8, 0.1, 32]} />
        <meshStandardMaterial color="#b7b4a5" roughness={1} />
      </mesh>
    </>
  );
}

function RiceFields() {
  const plots = Array.from({ length: 64 }, (_, i) => ({
    x: (i % 8 - 3.5) * 23,
    z: (Math.floor(i / 8) - 3.5) * 23,
    seed: i,
  }));
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[450, 450]} />
        <meshStandardMaterial color="#687e50" roughness={1} />
      </mesh>
      {plots.map((p) => (
        <group key={p.seed} position={[p.x, 0.025, p.z]}>
          <mesh receiveShadow>
            <boxGeometry args={[20, 0.06, 20]} />
            <meshStandardMaterial color={p.seed % 4 === 0 ? "#688c47" : "#829c56"} roughness={1} />
          </mesh>
          <mesh position={[0, 0.038, 0]} receiveShadow>
            <boxGeometry args={[18.4, 0.012, 18.4]} />
            <meshStandardMaterial color="#427b77" metalness={0.15} roughness={0.3} />
          </mesh>
          {[-6, -3, 0, 3, 6].map((r) => (
            <mesh key={r} position={[r, 0.11, 0]}>
              <boxGeometry args={[0.7, 0.18, 16.5]} />
              <meshStandardMaterial color={p.seed % 3 === 0 ? "#90bb55" : "#8cad42"} roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 2.5, -105]} castShadow>
        <boxGeometry args={[14, 5, 12]} />
        <meshStandardMaterial color="#d4d1bc" roughness={0.9} />
      </mesh>
      <mesh position={[0, 6.8, -105]} castShadow rotation={[0, 0, 0]}>
        <coneGeometry args={[11, 5, 4]} />
        <meshStandardMaterial color="#6d5444" roughness={0.9} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <Tree key={i} x={(i % 12 - 6) * 15} y={0} z={i < 12 ? -116 : 116} size={0.7} />
      ))}
    </>
  );
}

function Ocean() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(430, 430, 64, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from((geometry.getAttribute("position") as BufferAttribute).array), [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const meshRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const positions = geometry.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < positions.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      positions.setY(i, 0.18 * Math.sin(x * 0.09 + t * 1.6) + 0.12 * Math.sin(z * 0.13 - t * 1.25));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return (
    <>
      <mesh ref={meshRef} geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#247da0" metalness={0.48} roughness={0.27} />
      </mesh>
      <mesh receiveShadow position={[-112, -0.3, 0]}>
        <boxGeometry args={[100, 0.7, 420]} />
        <meshStandardMaterial color="#c6b58f" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[-156, 0.2, 0]}>
        <boxGeometry args={[20, 1, 420]} />
        <meshStandardMaterial color="#647c52" roughness={1} />
      </mesh>
      {Array.from({ length: 18 }, (_, i) => (
        <Tree key={i} x={-156 + i % 3 * 4} z={(Math.floor(i / 3) - 3) * 32} y={0.8} size={0.7} />
      ))}
      <group position={[52, 0.6, -55]}>
        <mesh castShadow>
          <boxGeometry args={[10, 1.2, 3.5]} />
          <meshStandardMaterial color="#f4f4ee" metalness={0.15} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <boxGeometry args={[3.5, 1.5, 3]} />
          <meshStandardMaterial color="#a4bdc9" metalness={0.35} roughness={0.25} />
        </mesh>
      </group>
    </>
  );
}

export function World({ environment, hour }: WorldProps) {
  const angle = Math.PI * (hour - 6) / 13;
  const sunPosition: [number, number, number] = [
    Math.cos(angle) * 90,
    Math.max(8, Math.sin(angle) * 110),
    -38,
  ];
  const dusk = hour < 8 || hour > 17;
  const sky = dusk ? "#a78c91" : "#86b8d8";
  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 110, 330]} />
      <hemisphereLight intensity={dusk ? 0.8 : 1.3} color="#dbeaff" groundColor="#59664d" />
      <directionalLight
        castShadow
        position={sunPosition}
        intensity={dusk ? 1.8 : 2.7}
        color={dusk ? "#ffc38d" : "#fff4dc"}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={260}
        shadow-camera-left={-115}
        shadow-camera-right={115}
        shadow-camera-top={115}
        shadow-camera-bottom={-115}
        shadow-bias={-0.0003}
      />
      <mesh position={sunPosition}>
        <sphereGeometry args={[6, 20, 20]} />
        <meshBasicMaterial color={dusk ? "#ffce8b" : "#fff8d4"} fog={false} />
      </mesh>
      {environment === "city" && <City />}
      {environment === "mountains" && <Mountains />}
      {environment === "rice" && <RiceFields />}
      {environment === "ocean" && <Ocean />}
    </>
  );
}

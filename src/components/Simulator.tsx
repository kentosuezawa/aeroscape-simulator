"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { Drone } from "./Drone";
import { World } from "./World";
import { environments, type EnvironmentId } from "@/lib/world";
import {
  createFlightState,
  getAltitude,
  getHeading,
  getSpeed,
  stepFlight,
  toggleTakeoffLanding,
  type FlightInput,
  type FlightState,
  type FlightStatus,
} from "@/lib/flight";

type CameraMode = "follow" | "fpv" | "top";
type Telemetry = {
  altitude: number;
  speed: number;
  heading: number;
  elapsed: number;
  status: FlightStatus;
  x: number;
  z: number;
};

const cameraModes: CameraMode[] = ["follow", "fpv", "top"];
const cameraLabels: Record<CameraMode, string> = {
  follow: "追従カメラ",
  fpv: "FPVカメラ",
  top: "俯瞰カメラ",
};
const statusLabels: Record<FlightStatus, string> = {
  grounded: "待機中",
  "taking-off": "離陸中",
  flying: "飛行中",
  landing: "着陸中",
  crashed: "衝突・停止",
};

const controls = [
  ["W / S", "前進・後退"], ["A / D", "左右移動"],
  ["Space / Shift", "上昇・下降"], ["Q / E", "左右旋回"],
  ["T", "自動離陸・着陸"], ["C", "カメラ変更"],
  ["P", "一時停止"], ["R", "リセット"], ["H", "操作ガイド"],
];

function readInput(keys: Set<string>): FlightInput {
  const axis = (plus: string, minus: string) => Number(keys.has(plus)) - Number(keys.has(minus));
  return {
    forward: axis("KeyW", "KeyS"),
    right: axis("KeyD", "KeyA"),
    up: Number(keys.has("Space")) - Number(keys.has("ShiftLeft") || keys.has("ShiftRight")),
    yaw: axis("KeyE", "KeyQ"),
  };
}

function SceneController({
  flight, keys, environment, windSpeed, windDirection, hour, paused, cameraMode, onTelemetry,
}: {
  flight: RefObject<FlightState>;
  keys: RefObject<Set<string>>;
  environment: EnvironmentId;
  windSpeed: number;
  windDirection: number;
  hour: number;
  paused: boolean;
  cameraMode: CameraMode;
  onTelemetry: (flight: FlightState) => void;
}) {
  const drone = useRef<Group>(null);
  const { camera } = useThree();
  const lastTelemetry = useRef(0);
  const desiredCamera = useRef(new Vector3());
  const lookAt = useRef(new Vector3());

  useFrame(({ clock }, delta) => {
    const f = flight.current;
    if (!paused) {
      const boundedDelta = Math.min(delta, 0.08);
      const steps = Math.max(1, Math.ceil(boundedDelta / (1 / 60)));
      const substep = boundedDelta / steps;
      for (let i = 0; i < steps; i++) {
        stepFlight(f, readInput(keys.current), environment, {
          speed: windSpeed, direction: windDirection,
        }, substep);
      }
    }

    if (drone.current) {
      drone.current.position.set(...f.position);
      drone.current.rotation.set(f.pitch, -f.yaw, f.roll, "YXZ");
    }

    const [x, y, z] = f.position;
    const sin = Math.sin(f.yaw);
    const cos = Math.cos(f.yaw);
    if (cameraMode === "fpv") {
      desiredCamera.current.set(x + sin * 0.9, y + 0.18, z - cos * 0.9);
      lookAt.current.set(x + sin * 50, y + 0.08, z - cos * 50);
    } else if (cameraMode === "top") {
      desiredCamera.current.set(x + 0.01, y + 23, z + 0.01);
      lookAt.current.set(x, y, z);
    } else {
      desiredCamera.current.set(x - sin * 10, y + 4.3, z + cos * 10);
      lookAt.current.set(x + sin * 2, y + 0.65, z - cos * 2);
    }
    camera.position.lerp(desiredCamera.current, 1 - Math.exp(-Math.min(delta, 0.1) * 5.5));
    camera.lookAt(lookAt.current);

    if (clock.elapsedTime - lastTelemetry.current > 0.12) {
      lastTelemetry.current = clock.elapsedTime;
      onTelemetry(f);
    }
  });

  return (
    <>
      <World environment={environment} hour={hour} />
      <Drone ref={drone} spinning={!paused && flight.current.status !== "grounded" && flight.current.status !== "crashed"} />
    </>
  );
}

export default function Simulator() {
  const [environment, setEnvironment] = useState<EnvironmentId>("rice");
  const [windSpeed, setWindSpeed] = useState(4);
  const [windDirection, setWindDirection] = useState(90);
  const [hour, setHour] = useState(13);
  const [cameraMode, setCameraMode] = useState<CameraMode>("follow");
  const [paused, setPaused] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  const flight = useRef<FlightState>(createFlightState());
  const keys = useRef<Set<string>>(new Set());
  const [telemetry, setTelemetry] = useState<Telemetry>({
    altitude: 0, speed: 0, heading: 0, elapsed: 0, status: "grounded", x: 0, z: 0,
  });

  const updateTelemetry = useCallback((state: FlightState) => {
    setTelemetry({
      altitude: getAltitude(state, environment),
      speed: getSpeed(state),
      heading: getHeading(state),
      elapsed: state.elapsed,
      status: state.status,
      x: state.position[0],
      z: state.position[2],
    });
  }, [environment]);

  const resetFlight = useCallback(() => {
    flight.current = createFlightState();
    keys.current.clear();
    setPaused(false);
    updateTelemetry(flight.current);
  }, [updateTelemetry]);

  const changeEnvironment = (next: EnvironmentId) => {
    setEnvironment(next);
    flight.current = createFlightState();
    keys.current.clear();
    setPaused(false);
    setTelemetry({ altitude: 0, speed: 0, heading: 0, elapsed: 0, status: "grounded", x: 0, z: 0 });
  };

  const nextCamera = useCallback(() => {
    setCameraMode(current => cameraModes[(cameraModes.indexOf(current) + 1) % cameraModes.length]);
  }, []);

  useEffect(() => {
    const isTyping = (target: EventTarget | null): boolean =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
      keys.current.add(event.code);
      if (event.repeat) return;
      switch (event.code) {
        case "KeyT": toggleTakeoffLanding(flight.current); break;
        case "KeyP": setPaused(current => !current); break;
        case "KeyR": resetFlight(); break;
        case "KeyC": nextCamera(); break;
        case "KeyH": setShowHelp(current => !current); break;
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const onBlur = () => keys.current.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [nextCamera, resetFlight]);

  const activeEnvironment = environments.find(item => item.id === environment)!;
  const elapsedSeconds = Math.floor(telemetry.elapsed);
  const time = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return (
    <main className="sim-shell">
      <div className="scene-canvas" aria-label="3D drone simulator">
        <Canvas shadows dpr={[1, 1.7]} camera={{ fov: 62, near: 0.1, far: 500, position: [0, 5, 12] }} gl={{ antialias: true }}>
          <SceneController
            flight={flight} keys={keys} environment={environment}
            windSpeed={windSpeed} windDirection={windDirection} hour={hour}
            paused={paused} cameraMode={cameraMode} onTelemetry={updateTelemetry}
          />
        </Canvas>
      </div>

      <header className="header">
        <div className="brand"><span className="brand-mark">A</span>
          <span><strong>AEROSCAPE</strong><small>DRONE FLIGHT SIMULATOR</small></span>
        </div>
        <div className="header-meta">
          <span className="header-pill"><span className="green-dot" /> LOCAL SIMULATION</span>
          <span className="header-pill subtle">v0.1</span>
        </div>
      </header>

      <section className="hud" aria-label="Flight telemetry">
        <div className="hud-heading"><span className="hud-indicator" /> FLIGHT TELEMETRY</div>
        <div className="hud-cards">
          <div className="hud-card"><span>ALTITUDE</span><strong>{telemetry.altitude.toFixed(1)} <small>m</small></strong></div>
          <div className="hud-card"><span>AIRSPEED*</span><strong>{telemetry.speed.toFixed(1)} <small>m/s</small></strong></div>
          <div className="hud-card"><span>HEADING</span><strong>{Math.round(telemetry.heading).toString().padStart(3, "0")}<small>°</small></strong></div>
          <div className="hud-card"><span>FLIGHT TIME</span><strong>{time}</strong></div>
        </div>
        <div className="hud-status">
          <span className={`status-dot ${telemetry.status === "crashed" ? "crashed" : ""}`} />
          {statusLabels[telemetry.status]}
        </div>
        <p className="hud-note">*表示速度は対地速度の近似値です。</p>
      </section>

      <aside className="control-panel" aria-label="Simulation settings">
        <div className="panel-heading"><span>SIMULATION SETTINGS</span><span className="panel-lines">≡</span></div>
        <label className="field">
          <span>環境 <em>ENVIRONMENT</em></span>
          <select value={environment} onChange={event => changeEnvironment(event.target.value as EnvironmentId)}>
            {environments.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <small>{activeEnvironment.caption}</small>
        </label>
        <div className="panel-divider" />
        <div className="panel-section-title">SUN & WEATHER</div>
        <label className="field slider-field">
          <span>太陽 / 時間帯 <b>{String(Math.floor(hour)).padStart(2, "0")}:00</b></span>
          <input type="range" min="6" max="19" step="1" value={hour} onChange={event => setHour(Number(event.target.value))} />
          <div className="range-ends"><span>06:00</span><span>19:00</span></div>
        </label>
        <label className="field slider-field">
          <span>風速 <b>{windSpeed.toFixed(0)} m/s</b></span>
          <input type="range" min="0" max="20" step="1" value={windSpeed} onChange={event => setWindSpeed(Number(event.target.value))} />
          <div className="range-ends"><span>0 m/s</span><span>20 m/s</span></div>
        </label>
        <label className="field slider-field">
          <span>風向（吹いていく向き） <b>{windDirection}°</b></span>
          <input type="range" min="0" max="360" step="15" value={windDirection} onChange={event => setWindDirection(Number(event.target.value))} />
          <div className="range-ends"><span>北</span><span>東</span><span>南</span><span>西</span><span>北</span></div>
        </label>
        <div className="panel-divider" />
        <div className="panel-section-title">CAMERA</div>
        <div className="camera-switch">
          {cameraModes.map(mode => (
            <button key={mode} type="button" onClick={() => setCameraMode(mode)}
              className={cameraMode === mode ? "selected" : ""}>
              {mode === "follow" ? "FOLLOW" : mode.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="camera-caption">{cameraLabels[cameraMode]}</p>
        <div className="action-buttons">
          <button className="primary-action" type="button" disabled={telemetry.status === "crashed"}
            onClick={() => toggleTakeoffLanding(flight.current)}>
            {telemetry.status === "grounded" ? "離陸する" : telemetry.status === "landing" ? "着陸中…" : "着陸する"}
          </button>
          <button type="button" onClick={() => setPaused(p => !p)}>{paused ? "再開" : "停止"}</button>
          <button type="button" onClick={resetFlight}>リセット</button>
        </div>
      </aside>

      <div className="world-label"><span className="world-label-caption">ACTIVE WORLD</span><strong>{activeEnvironment.label}</strong></div>

      {showHelp ? (
        <section className="help-panel" aria-label="Keyboard controls">
          <div className="help-heading"><strong>操作ガイド</strong><button type="button" onClick={() => setShowHelp(false)}>非表示 ×</button></div>
          <div className="help-grid">
            {controls.map(([key, description]) => (
              <div key={key}><kbd>{key}</kbd><span>{description}</span></div>
            ))}
          </div>
        </section>
      ) : (
        <button type="button" className="show-help" onClick={() => setShowHelp(true)}>H · 操作ガイド</button>
      )}
      {paused && <div className="pause-indicator">PAUSED</div>}
      {telemetry.status === "crashed" && <div className="crash-indicator">COLLISION DETECTED — Rキーでリセット</div>}
      <footer className="footer"><span>SIMULATION ONLY · NOT FOR REAL-FLIGHT PLANNING</span><span>Next.js × Three.js</span></footer>
    </main>
  );
}

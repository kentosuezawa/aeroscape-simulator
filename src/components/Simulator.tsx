"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Vector3, type Group } from "three";
import { Drone } from "./Drone";
import { World } from "./World";
import { Seabirds } from "./Seabirds";
import { MobileControls } from "./MobileControls";
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
  ["マウスドラッグ", "視点を上下左右に回す"],
  ["マウスホイール", "距離を変更（FPV以外）"],
  ["矢印キー", "視点を上下左右に回す"],
  ["画面ダブルクリック", "視点を初期位置へ"],
];

function readInput(keys: Set<string>, touch: FlightInput): FlightInput {
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  const axis = (plus: string, minus: string) => Number(keys.has(plus)) - Number(keys.has(minus));
  return {
    forward: clamp(axis("KeyW", "KeyS") + touch.forward),
    right: clamp(axis("KeyD", "KeyA") + touch.right),
    up: clamp(Number(keys.has("Space")) - Number(keys.has("ShiftLeft") || keys.has("ShiftRight")) + touch.up),
    yaw: clamp(axis("KeyE", "KeyQ") + touch.yaw),
  };
}

function SceneController({
  flight, keys, touchInput, environment, windSpeed, windDirection, hour, paused, cameraMode, birdCount, onTelemetry,
}: {
  flight: RefObject<FlightState>;
  keys: RefObject<Set<string>>;
  touchInput: RefObject<FlightInput>;
  environment: EnvironmentId;
  windSpeed: number;
  windDirection: number;
  hour: number;
  paused: boolean;
  cameraMode: CameraMode;
  birdCount: number;
  onTelemetry: (flight: FlightState) => void;
}) {
  const drone = useRef<Group>(null);
  const { camera, gl } = useThree();
  const cameraViews = useRef<Record<CameraMode, { azimuth: number; elevation: number; distance: number }>>({
    follow: { azimuth: 0, elevation: 0.33, distance: 11 },
    fpv: { azimuth: 0, elevation: 0, distance: 0 },
    top: { azimuth: 0, elevation: 1.36, distance: 26 },
  });

  useEffect(() => {
    const canvas = gl.domElement;
    let dragging: { pointerId: number; x: number; y: number } | null = null;
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging || dragging.pointerId !== event.pointerId) return;
      const dx = event.clientX - dragging.x;
      const dy = event.clientY - dragging.y;
      dragging.x = event.clientX;
      dragging.y = event.clientY;

      const view = cameraViews.current[cameraMode];
      view.azimuth -= dx * 0.005;
      view.elevation += (cameraMode === "fpv" ? -1 : 1) * dy * 0.0045;
      const min = cameraMode === "fpv" ? -1.35 : cameraMode === "top" ? 0.22 : -0.2;
      const max = cameraMode === "fpv" ? 1.35 : 1.53;
      view.elevation = Math.max(min, Math.min(max, view.elevation));
    };
    const onUp = (event: PointerEvent) => {
      if (dragging?.pointerId !== event.pointerId) return;
      dragging = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      canvas.style.cursor = "grab";
    };
    const onLostCapture = () => {
      dragging = null;
      canvas.style.cursor = "grab";
    };
    const onWheel = (event: WheelEvent) => {
      if (cameraMode === "fpv") return;
      event.preventDefault();
      const view = cameraViews.current[cameraMode];
      view.distance = Math.min(
        cameraMode === "top" ? 65 : 26,
        Math.max(cameraMode === "top" ? 12 : 4.5, view.distance + event.deltaY * 0.012)
      );
    };
    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      cameraViews.current[cameraMode] = cameraMode === "follow"
        ? { azimuth: 0, elevation: 0.33, distance: 11 }
        : cameraMode === "fpv"
          ? { azimuth: 0, elevation: 0, distance: 0 }
          : { azimuth: 0, elevation: 1.36, distance: 26 };
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("lostpointercapture", onLostCapture);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDoubleClick);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("lostpointercapture", onLostCapture);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.style.cursor = "";
      canvas.style.touchAction = "";
    };
  }, [cameraMode, gl]);
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
        stepFlight(f, readInput(keys.current, touchInput.current), environment, {
          speed: windSpeed, direction: windDirection,
        }, substep);
      }
    }

    if (drone.current) {
      drone.current.position.set(...f.position);
      drone.current.rotation.set(f.pitch, -f.yaw, f.roll, "YXZ");
    }

    const [x, y, z] = f.position;
    const view = cameraViews.current[cameraMode];

    view.azimuth += (Number(keys.current.has("ArrowLeft")) - Number(keys.current.has("ArrowRight"))) * delta * 1.35;
    const lookVertical = Number(keys.current.has("ArrowUp")) - Number(keys.current.has("ArrowDown"));
    view.elevation += (cameraMode === "fpv" ? 1 : -1) * lookVertical * delta * 0.85;
    view.elevation = Math.max(
      cameraMode === "fpv" ? -1.35 : cameraMode === "top" ? 0.22 : -0.2,
      Math.min(cameraMode === "fpv" ? 1.35 : 1.53, view.elevation)
    );
    const lookYaw = f.yaw + view.azimuth;

    if (cameraMode === "fpv") {
      desiredCamera.current.set(
        x + Math.sin(f.yaw) * 0.63, y + 0.2, z - Math.cos(f.yaw) * 0.63
      );
      lookAt.current.set(
        desiredCamera.current.x + Math.sin(lookYaw) * Math.cos(view.elevation) * 50,
        desiredCamera.current.y + Math.sin(view.elevation) * 50,
        desiredCamera.current.z - Math.cos(lookYaw) * Math.cos(view.elevation) * 50
      );
    } else {
      const horizontal = Math.cos(view.elevation) * view.distance;
      desiredCamera.current.set(
        x - Math.sin(lookYaw) * horizontal,
        y + Math.sin(view.elevation) * view.distance,
        z + Math.cos(lookYaw) * horizontal
      );
      lookAt.current.set(x, y + 0.3, z);
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
      {environment === "ocean" && <Seabirds flight={flight} paused={paused} count={birdCount} />}
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
  const [birdCount, setBirdCount] = useState(96);
  const [isTouch, setIsTouch] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const flight = useRef<FlightState>(createFlightState());
  const keys = useRef<Set<string>>(new Set());
  const touchInput = useRef<FlightInput>({ forward: 0, right: 0, up: 0, yaw: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const updateTouch = () => {
      const mobile = mq.matches || window.innerWidth <= 700;
      setIsTouch(mobile);
      if (mobile) setShowHelp(false);
    };
    updateTouch();
    mq.addEventListener("change", updateTouch);
    window.addEventListener("resize", updateTouch);
    return () => {
      mq.removeEventListener("change", updateTouch);
      window.removeEventListener("resize", updateTouch);
    };
  }, []);
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
    touchInput.current = { forward: 0, right: 0, up: 0, yaw: 0 };
    setPaused(false);
    updateTelemetry(flight.current);
  }, [updateTelemetry]);

  const changeEnvironment = (next: EnvironmentId) => {
    setEnvironment(next);
    flight.current = createFlightState();
    keys.current.clear();
    touchInput.current = { forward: 0, right: 0, up: 0, yaw: 0 };
    setPaused(false);
    setShowMobileSettings(false);
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
    const onBlur = () => {
      keys.current.clear();
      touchInput.current = { forward: 0, right: 0, up: 0, yaw: 0 };
    };
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
        <Canvas
          shadows={!isTouch}
          dpr={isTouch ? [1, 1.25] : [1, 1.7]}
          camera={{ fov: 62, near: 0.1, far: 500, position: [0, 5, 12] }}
          gl={{ antialias: !isTouch }}
        >
          <SceneController
            flight={flight} keys={keys} touchInput={touchInput} environment={environment}
            windSpeed={windSpeed} windDirection={windDirection} hour={hour}
            paused={paused} cameraMode={cameraMode} birdCount={birdCount} onTelemetry={updateTelemetry}
          />
        </Canvas>
      </div>

      <header className="header">
        <div className="brand"><span className="brand-mark">A</span>
          <span><strong>AEROSCAPE</strong><small>DRONE FLIGHT SIMULATOR</small></span>
        </div>
        <div className="header-meta">
          <span className="header-pill"><span className="green-dot" /> LOCAL SIMULATION</span>
          <span className="header-pill subtle">v0.3</span>
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

      <nav className="mobile-top-actions" aria-label="モバイルメニュー">
        <button type="button" onClick={() => { setShowMobileSettings(v => !v); setShowHelp(false); }}
          aria-expanded={showMobileSettings}>
          {showMobileSettings ? "設定を閉じる" : "環境・風の設定"}
        </button>
        <button type="button" onClick={() => { setShowHelp(v => !v); setShowMobileSettings(false); }}
          aria-expanded={showHelp}>
          {showHelp ? "ガイドを閉じる" : "操作ガイド"}
        </button>
      </nav>

      <aside className={`control-panel ${showMobileSettings ? "mobile-open" : ""}`} aria-label="Simulation settings">
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
        <p className="camera-caption">{cameraLabels[cameraMode]} · ドラッグ / 矢印キーで上下左右を見回す · ダブルクリックで視点を戻す</p>
        {environment === "ocean" && (
          <>
            <div className="panel-divider" />
            <div className="panel-section-title">SEABIRD ATTRACTION</div>
            <label className="field">
              <span>海鳥の群れ <b>{birdCount} 羽</b></span>
              <select value={birdCount} onChange={event => setBirdCount(Number(event.target.value))}>
                <option value={24}>少なめ · 24羽</option>
                <option value={60}>標準 · 60羽</option>
                <option value={96}>大量 · 96羽</option>
              </select>
              <small>海上に群れが次々と現れ、機体の近くを飛び抜けます。描画負荷が高い場合は羽数を減らしてください。</small>
            </label>
          </>
        )
        <div className="action-buttons">
          <button className="primary-action" type="button" disabled={telemetry.status === "crashed"}
            onClick={() => toggleTakeoffLanding(flight.current)}>
            {telemetry.status === "grounded" ? "離陸する" : telemetry.status === "landing" ? "着陸中…" : "着陸する"}
          </button>
          <button type="button" onClick={() => setPaused(p => !p)}>{paused ? "再開" : "停止"}</button>
          <button type="button" onClick={resetFlight}>リセット</button>
        </div>
      </aside>

      {isTouch && (
        <MobileControls
          input={touchInput}
          flightStatus={telemetry.status}
          paused={paused}
          onToggleFlight={() => toggleTakeoffLanding(flight.current)}
          onCycleCamera={nextCamera}
          onTogglePause={() => setPaused(value => !value)}
          onReset={resetFlight}
        />
      )}

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

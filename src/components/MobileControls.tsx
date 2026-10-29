"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { FlightInput, FlightStatus } from "@/lib/flight";

type StickName = "movement" | "altitude";

function Stick({
  name,
  title,
  subtitle,
  onChange,
}: {
  name: StickName;
  title: string;
  subtitle: string;
  onChange: (name: StickName, x: number, y: number) => void;
}) {
  const activePointer = useRef<number | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  function update(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2 - 23);
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(dx, dy);
    const scale = length > radius ? radius / length : 1;
    const x = (dx * scale) / radius;
    const y = -(dy * scale) / radius;
    setPosition({ x, y });
    onChange(name, x, y);
  }

  function release() {
    activePointer.current = null;
    setPosition({ x: 0, y: 0 });
    onChange(name, 0, 0);
  }

  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== null) return;
    event.preventDefault();
    event.stopPropagation();
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event);
  };

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    update(event);
  };

  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    release();
  };

  useEffect(() => {
    const resetOnBlur = () => release();
    window.addEventListener("blur", resetOnBlur);
    return () => window.removeEventListener("blur", resetOnBlur);
    // The parent ref is stable, and onChange only writes to a mutable input ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="touch-stick-group">
      <div className="touch-stick-title">{title}</div>
      <div
        className="touch-stick"
        role="group"
        aria-label={subtitle}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={() => {
          if (activePointer.current !== null) release();
        }}
      >
        <div className="touch-stick-ring" />
        <div className="touch-stick-guide guide-horizontal" />
        <div className="touch-stick-guide guide-vertical" />
        <div
          className="touch-stick-thumb"
          style={{ transform: `translate(calc(-50% + ${position.x * 37}px), calc(-50% - ${position.y * 37}px))` }}
        />
      </div>
      <span className="touch-stick-caption">{subtitle}</span>
    </div>
  );
}

export function MobileControls({
  input,
  flightStatus,
  paused,
  onToggleFlight,
  onCycleCamera,
  onTogglePause,
  onReset,
}: {
  input: RefObject<FlightInput>;
  flightStatus: FlightStatus;
  paused: boolean;
  onToggleFlight: () => void;
  onCycleCamera: () => void;
  onTogglePause: () => void;
  onReset: () => void;
}) {
  const setAxes = (name: StickName, x: number, y: number) => {
    if (name === "movement") {
      input.current.forward = y;
      input.current.right = x;
    } else {
      input.current.yaw = x;
      input.current.up = y;
    }
  };

  return (
    <section className="mobile-flight-controls" aria-label="スマートフォン用ドローン操作">
      <Stick name="movement" title="移動" subtitle="前後・左右" onChange={setAxes} />
      <div className="mobile-flight-actions">
        <button
          type="button"
          className="mobile-action-primary"
          disabled={flightStatus === "crashed"}
          onClick={onToggleFlight}
        >
          {flightStatus === "grounded" ? "離陸" : flightStatus === "landing" ? "着陸中" : "着陸"}
        </button>
        <button type="button" onClick={onCycleCamera}>視点切替</button>
        <button type="button" onClick={onTogglePause}>{paused ? "再開" : "一時停止"}</button>
        <button type="button" onClick={onReset}>リセット</button>
      </div>
      <Stick name="altitude" title="旋回・高度" subtitle="左右旋回・上下" onChange={setAxes} />
    </section>
  );
}

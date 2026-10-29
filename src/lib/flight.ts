import { collidesWithBuilding, terrainHeight, type EnvironmentId } from "./world";

export type FlightStatus = "grounded" | "taking-off" | "flying" | "landing" | "crashed";
export type Vec3 = [number, number, number];

export interface FlightState {
  position: Vec3;
  velocity: Vec3;
  yaw: number;
  pitch: number;
  roll: number;
  status: FlightStatus;
  elapsed: number;
}

export interface FlightInput {
  forward: number;
  right: number;
  up: number;
  yaw: number;
}

export interface WindSettings {
  speed: number;
  direction: number; // degrees wind blows TOWARD, clockwise from north
}

const MAX_SPEED = 12;
const MAX_VERTICAL_SPEED = 5;
const YAW_SPEED = Math.PI / 2;
const CLEARANCE = 0.65;

export function createFlightState(): FlightState {
  return {
    position: [0, CLEARANCE, 0],
    velocity: [0, 0, 0],
    yaw: 0,
    pitch: 0,
    roll: 0,
    status: "grounded",
    elapsed: 0,
  };
}

export function getAltitude(state: FlightState, environment: EnvironmentId): number {
  return Math.max(0, state.position[1] - terrainHeight(environment, state.position[0], state.position[2]) - CLEARANCE);
}

export function getSpeed(state: FlightState): number {
  return Math.hypot(...state.velocity);
}

export function getHeading(state: FlightState): number {
  return (state.yaw * 180 / Math.PI + 360) % 360;
}

export function toggleTakeoffLanding(state: FlightState): void {
  if (state.status === "grounded") state.status = "taking-off";
  else if (state.status === "flying" || state.status === "taking-off") state.status = "landing";
}

function approach(value: number, target: number, sharpness: number, dt: number): number {
  return value + (target - value) * (1 - Math.exp(-sharpness * dt));
}

export function stepFlight(
  state: FlightState,
  input: FlightInput,
  environment: EnvironmentId,
  wind: WindSettings,
  dt: number
): void {
  if (state.status === "crashed") return;
  const step = Math.min(1 / 30, Math.max(0, dt));
  if (step === 0) return;

  state.elapsed += step;
  if (state.status === "grounded") {
    if (input.up > 0) state.status = "taking-off";
    else {
      state.velocity = [0, 0, 0];
      state.pitch = approach(state.pitch, 0, 6, step);
      state.roll = approach(state.roll, 0, 6, step);
      return;
    }
  }

  state.yaw += input.yaw * YAW_SPEED * step;
  const forward = input.forward;
  const right = input.right;
  const magnitude = Math.max(1, Math.hypot(forward, right));
  const f = forward / magnitude;
  const r = right / magnitude;

  const desiredX = (Math.sin(state.yaw) * f + Math.cos(state.yaw) * r) * MAX_SPEED;
  const desiredZ = (-Math.cos(state.yaw) * f + Math.sin(state.yaw) * r) * MAX_SPEED;
  const windRadians = wind.direction * Math.PI / 180;
  const gust = 1 + 0.18 * Math.sin(state.elapsed * 1.9) + 0.12 * Math.sin(state.elapsed * 4.7);
  const windX = Math.sin(windRadians) * wind.speed * gust * 0.19;
  const windZ = -Math.cos(windRadians) * wind.speed * gust * 0.19;
  const landing = state.status === "landing";
  const horizontalResponse = landing ? 2.5 : (Math.abs(f) + Math.abs(r) > 0 ? 2.4 : 1.8);

  state.velocity[0] = approach(state.velocity[0], (landing ? 0 : desiredX) + windX, horizontalResponse, step);
  state.velocity[2] = approach(state.velocity[2], (landing ? 0 : desiredZ) + windZ, horizontalResponse, step);

  const altitude = getAltitude(state, environment);
  let desiredVY = input.up * MAX_VERTICAL_SPEED;
  if (state.status === "taking-off") {
    desiredVY = altitude < 3 ? 2.6 : 0;
    if (altitude >= 3) state.status = "flying";
  } else if (landing) {
    desiredVY = altitude > 1.5 ? -1.8 : -0.7;
  }
  state.velocity[1] = approach(state.velocity[1], desiredVY, 3, step);

  state.position[0] += state.velocity[0] * step;
  state.position[1] += state.velocity[1] * step;
  state.position[2] += state.velocity[2] * step;

  const ground = terrainHeight(environment, state.position[0], state.position[2]) + CLEARANCE;
  if (state.position[1] <= ground) {
    const impact = -state.velocity[1];
    state.position[1] = ground;
    state.velocity = [0, 0, 0];
    state.status = landing || (state.status === "taking-off" && impact < 1.2) || impact < 1.5
      ? "grounded" : "crashed";
  }

  if (environment === "city" && collidesWithBuilding(...state.position)) {
    state.status = "crashed";
    state.velocity = [0, 0, 0];
  }

  const targetPitch = landing ? 0 : -f * 0.19;
  const targetRoll = landing ? 0 : -r * 0.19;
  state.pitch = approach(state.pitch, targetPitch, 4, step);
  state.roll = approach(state.roll, targetRoll, 4, step);
}

export type EnvironmentId = "city" | "mountains" | "rice" | "ocean";

export const environments: { id: EnvironmentId; label: string; caption: string }[] = [
  { id: "city", label: "市街地", caption: "建物と道路を抜ける都市飛行" },
  { id: "mountains", label: "山", caption: "起伏に富む山岳地形" },
  { id: "rice", label: "田んぼ", caption: "水田・畦道・農村風景" },
  { id: "ocean", label: "海", caption: "広い水面と海岸の風" },
];

export interface Building {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

const buildingColors = ["#64748b", "#9daab8", "#52667d", "#a7aaac", "#6b8096"];
export const buildings: Building[] = [];

for (let gx = -4; gx <= 4; gx++) {
  for (let gz = -4; gz <= 4; gz++) {
    if (Math.abs(gx) < 2 && Math.abs(gz) < 2) continue;
    if ((Math.abs(gx * 11 + gz * 7) % 17) === 3) continue;
    const hash = Math.abs(gx * 37 + gz * 53);
    buildings.push({
      x: gx * 25,
      z: gz * 25,
      width: 11 + (hash % 5),
      depth: 11 + (hash % 4),
      height: 12 + (hash % 7) * 5,
      color: buildingColors[hash % buildingColors.length],
    });
  }
}

export function terrainHeight(environment: EnvironmentId, x: number, z: number): number {
  if (environment !== "mountains") return 0;
  const distance = Math.sqrt(x * x + z * z);
  const blend = Math.min(1, distance / 35);
  const rolling =
    10 * Math.sin(x / 45) * Math.cos(z / 33) +
    7 * Math.sin((x + z) / 37) +
    6 * Math.cos((x - z) / 60);
  return Math.max(0, rolling + 9) * blend;
}

export function collidesWithBuilding(x: number, y: number, z: number): boolean {
  const radius = 0.6;
  for (const b of buildings) {
    if (
      Math.abs(x - b.x) < b.width / 2 + radius &&
      Math.abs(z - b.z) < b.depth / 2 + radius &&
      y - radius < b.height
    ) return true;
  }
  return false;
}

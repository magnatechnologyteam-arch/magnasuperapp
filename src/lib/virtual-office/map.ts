import type { Division } from "@/lib/supabase/types";

/**
 * Tahap H (modul baru) -- "Kantor Virtual": peta kantor 2D ala Gather.town
 * (avatar jalan-jalan pakai WASD/panah, bisa lihat siapa sedang online &
 * di ruangan mana). File ini SENGAJA murni data + logika geometri, tanpa
 * React/canvas sama sekali -- supaya bisa dites/dibaca lepas dari
 * VirtualOfficeClient.tsx yang isinya render loop.
 *
 * Layout: grid 3 kolom x 2 baris, tiap sel 260x270, dipisahkan koridor
 * 40px yang bisa dilewati bebas (space kosong ANTARA sel, bukan tembok) --
 * spawn point staf persis di perempatan koridor tengah.
 */

export type Rect = { x: number; y: number; w: number; h: number };

export type OfficeRoom = {
  id: string;
  label: string;
  rect: Rect;
  /** Warna lantai (tint tipis, dipakai fillStyle langsung -- canvas modern
   * terima hex 8-digit RRGGBBAA). */
  floorColor: string;
  /** Warna aksen (garis tepi ruangan + dipakai juga sebagai warna avatar
   * kalau ruangan ini "milik" satu divisi). */
  accentColor: string;
  /** null = ruangan netral (Meeting/Pantry), bukan milik satu divisi. */
  division: Division | null;
};

export const WORLD_W = 900;
export const WORLD_H = 620;
/** Margin tembok luar -- pusat avatar tidak boleh melewati batas ini. */
const WALL_MARGIN = 20;

export const PLAYER_RADIUS = 14;
/** Piksel per detik -- dipakai VirtualOfficeClient dikali delta-time frame,
 * BUKAN dikali langsung per-frame, supaya kecepatan gerak konsisten walau
 * frame rate perangkat beda-beda. */
export const PLAYER_SPEED = 190;

export const SPAWN = { x: 450, y: 310 };

/** Warna avatar per divisi -- dipisah dari DIVISION_BADGE_CLASSES di
 * supabase/types.ts karena itu class Tailwind (tidak bisa dipakai langsung
 * sebagai `ctx.fillStyle` di canvas), sedangkan di sini butuh hex asli. */
export const DIVISION_COLORS: Record<Division, string> = {
  magnarent: "#0ea5e9",
  magnative: "#d946ef",
  production: "#10b981",
  all: "#8b5cf6",
  investor: "#f59e0b",
  finance: "#14b8a6",
};

const COL1_X = 20;
const COL2_X = 320;
const COL3_X = 620;
const ROW1_Y = 20;
const ROW2_Y = 330;
const ROOM_W = 260;
const ROOM_H = 270;

export const ROOMS: OfficeRoom[] = [
  {
    id: "magnarent-desk",
    label: "Meja Magnarent",
    rect: { x: COL1_X, y: ROW1_Y, w: ROOM_W, h: ROOM_H },
    floorColor: "#0ea5e91a",
    accentColor: DIVISION_COLORS.magnarent,
    division: "magnarent",
  },
  {
    id: "magnativ-desk",
    label: "Meja Magnativ",
    rect: { x: COL2_X, y: ROW1_Y, w: ROOM_W, h: ROOM_H },
    floorColor: "#d946ef1a",
    accentColor: DIVISION_COLORS.magnative,
    division: "magnative",
  },
  {
    id: "production-desk",
    label: "Meja Production",
    rect: { x: COL3_X, y: ROW1_Y, w: ROOM_W, h: ROOM_H },
    floorColor: "#10b9811a",
    accentColor: DIVISION_COLORS.production,
    division: "production",
  },
  {
    id: "meeting-room",
    label: "Ruang Meeting",
    rect: { x: COL1_X, y: ROW2_Y, w: ROOM_W, h: ROOM_H },
    floorColor: "#0891b21a",
    accentColor: "#0891b2",
    division: null,
  },
  {
    id: "pantry",
    label: "Pantry",
    rect: { x: COL2_X, y: ROW2_Y, w: ROOM_W, h: ROOM_H },
    floorColor: "#f973161a",
    accentColor: "#f97316",
    division: null,
  },
  {
    id: "owner-room",
    label: "Ruang Owner/Admin",
    rect: { x: COL3_X, y: ROW2_Y, w: ROOM_W, h: ROOM_H },
    floorColor: "#8b5cf61a",
    accentColor: DIVISION_COLORS.all,
    division: "all",
  },
];

/** Obstacle (meja/meja-rapat/counter) -- INI yang benar-benar menghalangi
 * jalan avatar (bukan batas ruangan itu sendiri, yang cuma visual/label).
 * Dibuat manual per ruangan (bukan loop generik) supaya posisinya jelas
 * dibaca & mudah diubah tanpa harus bongkar rumus. */
export const OBSTACLES: Rect[] = [
  // 3 meja kerja tiap ruang divisi (60x30, jarak 20px, dipusatkan)
  ...(["magnarent-desk", "magnativ-desk", "production-desk"] as const).flatMap((roomId) => {
    const room = ROOMS.find((r) => r.id === roomId)!;
    const deskY = room.rect.y + 120;
    return [0, 1, 2].map((i) => ({
      x: room.rect.x + 20 + i * 80,
      y: deskY,
      w: 60,
      h: 30,
    }));
  }),
  // Meja rapat besar di tengah Ruang Meeting
  { x: COL1_X + 60, y: ROW2_Y + 90, w: 140, h: 90 },
  // Counter pantry menempel dinding atas
  { x: COL2_X + 20, y: ROW2_Y + 20, w: 220, h: 40 },
  // Meja kerja Owner/Admin, satu meja besar
  { x: COL3_X + 70, y: ROW2_Y + 40, w: 120, h: 50 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Lingkaran (posisi avatar) vs kotak (obstacle) -- pendekatan standar:
 * cari titik terdekat di kotak dari pusat lingkaran, lalu cek jaraknya. */
function circleRectOverlap(cx: number, cy: number, r: number, rect: Rect): boolean {
  const closestX = clamp(cx, rect.x, rect.x + rect.w);
  const closestY = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function collidesWithObstacle(x: number, y: number): boolean {
  return OBSTACLES.some((rect) => circleRectOverlap(x, y, PLAYER_RADIUS, rect));
}

/** Gerak avatar dengan collision sliding per-sumbu -- coba geser X dulu
 * (batalkan kalau nabrak), lalu Y dari hasil X (batalkan kalau nabrak) --
 * ini yang bikin avatar "mepet" tergelincir di tepi meja/tembok, bukan
 * berhenti total begitu nabrak satu sudut. */
export function resolveMove(x: number, y: number, dx: number, dy: number): { x: number; y: number } {
  const minX = WALL_MARGIN + PLAYER_RADIUS;
  const maxX = WORLD_W - WALL_MARGIN - PLAYER_RADIUS;
  const minY = WALL_MARGIN + PLAYER_RADIUS;
  const maxY = WORLD_H - WALL_MARGIN - PLAYER_RADIUS;

  let nx = clamp(x + dx, minX, maxX);
  if (collidesWithObstacle(nx, y)) nx = x;

  let ny = clamp(y + dy, minY, maxY);
  if (collidesWithObstacle(nx, ny)) ny = y;

  return { x: nx, y: ny };
}

/** Label ruangan tempat titik (x,y) berada, atau "Koridor" kalau di
 * lorong antar-ruangan -- dipakai untuk banner "Kamu sekarang di: ...". */
export function getRoomAt(x: number, y: number): OfficeRoom | null {
  return (
    ROOMS.find(
      (r) => x >= r.rect.x && x <= r.rect.x + r.rect.w && y >= r.rect.y && y <= r.rect.y + r.rect.h
    ) ?? null
  );
}

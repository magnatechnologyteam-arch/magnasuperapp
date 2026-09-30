"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MapPin, MessageSquare, Users } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { GLASS_BORDER, GLASS_SURFACE } from "@/lib/glass";
import { getInitials } from "@/lib/shared/utils";
import type { ChatRoom } from "@/lib/chat/rooms";
import type { Division } from "@/lib/supabase/types";
import type { OfficeRosterEntry } from "@/lib/virtual-office/data";
import {
  DIVISION_COLORS,
  OBSTACLES,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  ROOMS,
  SPAWN,
  WORLD_H,
  WORLD_W,
  getRoomAt,
  resolveMove,
} from "@/lib/virtual-office/map";

/**
 * Tahap H -- "Kantor Virtual" (permintaan Owner: model kantor virtual 2D
 * ala Gather.town). Komponen ini SATU-SATUNYA yang menyentuh canvas/game
 * loop/Supabase Realtime -- map.ts murni data & geometri, data.ts murni
 * fetch roster server-side.
 *
 * Multiplayer TANPA tabel database sama sekali -- posisi avatar cuma
 * hidup selama koneksi (Realtime Broadcast), dan "siapa online" dari
 * Realtime Presence. Sengaja begini (bukan disimpan ke Postgres per
 * gerakan) karena posisi jalan-jalan bukan data yang perlu awet -- kalau
 * disimpan tiap gerakan, itu ratusan write/detik per orang, sia-sia.
 */

type Dir = "up" | "down" | "left" | "right";
type RemotePos = { x: number; y: number; dir: Dir };

const CHANNEL_NAME = "kantor-virtual";
const BROADCAST_INTERVAL_MS = 70;
const CHAT_PROXIMITY_PX = 72;

type CurrentUser = { id: string; fullName: string; username: string | null; division: Division };

/** Pilih ruang chat yang bisa dilihat KEDUA pihak -- investor SENGAJA
 * tidak pernah dapat tombol chat (fitur Chat tim ditutup total untuk
 * investor, lihat lib/chat/rooms.ts availableChatRooms -- tombol yang
 * membawa mereka ke halaman yang langsung redirect balik cuma bikin
 * bingung, bukan fitur). */
function pickChatTarget(me: Division, other: OfficeRosterEntry): { room: ChatRoom; mention?: string } | null {
  if (me === "investor" || other.division === "investor") return null;
  const room: ChatRoom =
    me === other.division && (me === "magnarent" || me === "magnative" || me === "production") ? me : "bersama";
  return { room, mention: other.username ?? undefined };
}

export function VirtualOfficeClient({
  currentUser,
  roster,
}: {
  currentUser: CurrentUser;
  roster: OfficeRosterEntry[];
}) {
  const rosterById = useMemo(() => new Map(roster.map((r) => [r.id, r])), [roster]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef({ ...SPAWN });
  const dirRef = useRef<Dir>("down");
  const keysRef = useRef<Set<string>>(new Set());
  const remoteRef = useRef<Map<string, RemotePos>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastRef = useRef(0);
  const lastRoomLabelRef = useRef("");
  const lastNearbyIdRef = useRef<string | null>(null);
  const onlineIdsRef = useRef<string[]>([]);

  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [roomLabel, setRoomLabel] = useState("Koridor");
  const [nearby, setNearby] = useState<OfficeRosterEntry | null>(null);

  useEffect(() => {
    onlineIdsRef.current = onlineIds;
  }, [onlineIds]);

  // ---- Realtime: presence (siapa online) + broadcast (posisi jalan) ----
  // Satu channel dipakai bersama SELURUH pengguna yang buka halaman ini --
  // "key" presence = id pengguna, jadi kalau dia buka 2 tab tetap kehitung
  // satu orang (bukan dobel avatar).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: false }, presence: { key: currentUser.id } },
    });

    channel.on("broadcast", { event: "move" }, ({ payload }) => {
      const p = payload as { id: string; x: number; y: number; dir: Dir };
      if (p.id === currentUser.id) return;
      remoteRef.current.set(p.id, { x: p.x, y: p.y, dir: p.dir });
    });

    channel.on("presence", { event: "sync" }, () => {
      const ids = Object.keys(channel.presenceState());
      setOnlineIds(ids);
      for (const id of Array.from(remoteRef.current.keys())) {
        if (!ids.includes(id)) remoteRef.current.delete(id);
      }
    });

    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      channel.track({ onlineAt: new Date().toISOString() });
      channel.send({
        type: "broadcast",
        event: "move",
        payload: { id: currentUser.id, x: posRef.current.x, y: posRef.current.y, dir: dirRef.current },
      });
    });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUser.id]);

  // ---- Kontrol keyboard (WASD / tombol panah) ----
  useEffect(() => {
    const MOVE_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"]);
    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (!MOVE_KEYS.has(k)) return;
      keysRef.current.add(k);
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key.toLowerCase());
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ---- Tombol arah sentuh (HP) -- pakai "kunci virtual" yang sama
  // dengan keyboard supaya logika gerak di game loop cukup satu jalur. ----
  const pressVirtual = useCallback((key: string, down: boolean) => {
    if (down) keysRef.current.add(key);
    else keysRef.current.delete(key);
  }, []);

  // ---- Game loop -- SENGAJA dependency cuma currentUser.id (mount sekali)
  // supaya rAF loop tidak restart tiap kali onlineIds berubah (orang
  // lain keluar/masuk) -- state terbaru dibaca lewat ref (onlineIdsRef),
  // bukan lewat closure yang butuh effect di-restart. ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    // Dipindah ke const baru yang bertipe non-null EKSPLISIT -- TypeScript
    // tidak selalu mempertahankan penyempitan null-check di atas begitu
    // dipakai di dalam nested `function frame(...)` closure di bawah.
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WORLD_W * dpr;
    canvas.height = WORLD_H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const keys = keysRef.current;
      let vx = 0;
      let vy = 0;
      if (keys.has("arrowup") || keys.has("w")) vy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) vy += 1;
      if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
      if (keys.has("arrowright") || keys.has("d")) vx += 1;

      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy) || 1;
        const dx = (vx / len) * PLAYER_SPEED * dt;
        const dy = (vy / len) * PLAYER_SPEED * dt;
        posRef.current = resolveMove(posRef.current.x, posRef.current.y, dx, dy);
        dirRef.current = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? "right" : "left") : vy > 0 ? "down" : "up";
      }

      if (now - lastBroadcastRef.current > BROADCAST_INTERVAL_MS) {
        lastBroadcastRef.current = now;
        channelRef.current?.send({
          type: "broadcast",
          event: "move",
          payload: { id: currentUser.id, x: posRef.current.x, y: posRef.current.y, dir: dirRef.current },
        });
      }

      const room = getRoomAt(posRef.current.x, posRef.current.y);
      const label = room?.label ?? "Koridor";
      if (label !== lastRoomLabelRef.current) {
        lastRoomLabelRef.current = label;
        setRoomLabel(label);
      }

      let closestId: string | null = null;
      let closestDist = CHAT_PROXIMITY_PX;
      for (const [id, rp] of remoteRef.current.entries()) {
        const d = Math.hypot(rp.x - posRef.current.x, rp.y - posRef.current.y);
        if (d < closestDist) {
          closestDist = d;
          closestId = id;
        }
      }
      if (closestId !== lastNearbyIdRef.current) {
        lastNearbyIdRef.current = closestId;
        setNearby(closestId ? rosterById.get(closestId) ?? null : null);
      }

      drawScene(ctx, {
        onlineIds: onlineIdsRef.current,
        remotePositions: remoteRef.current,
        selfPos: posRef.current,
        currentUser,
        rosterById,
      });

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const chatTarget = nearby ? pickChatTarget(currentUser.division, nearby) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300",
            GLASS_SURFACE,
            GLASS_BORDER
          )}
        >
          <MapPin className="h-3.5 w-3.5 text-violet-500" />
          Kamu di: <span className="font-bold text-zinc-900 dark:text-white">{roomLabel}</span>
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300",
            GLASS_SURFACE,
            GLASS_BORDER
          )}
        >
          <Users className="h-3.5 w-3.5 text-emerald-500" />
          {onlineIds.length} orang online
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-white/10"
        style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}
      >
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

        {chatTarget && nearby && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <Link
              href={`/dashboard/chat?room=${chatTarget.room}${
                chatTarget.mention ? `&mention=${encodeURIComponent(chatTarget.mention)}` : ""
              }`}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 dark:bg-white dark:text-zinc-900"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat dengan {nearby.fullName.split(" ")[0]}
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 sm:hidden">
        <DpadButton icon={ChevronLeft} onPress={(d) => pressVirtual("arrowleft", d)} />
        <div className="flex flex-col gap-1.5">
          <DpadButton icon={ChevronUp} onPress={(d) => pressVirtual("arrowup", d)} />
          <DpadButton icon={ChevronDown} onPress={(d) => pressVirtual("arrowdown", d)} />
        </div>
        <DpadButton icon={ChevronRight} onPress={(d) => pressVirtual("arrowright", d)} />
      </div>

      <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 sm:text-left">
        Gerak pakai tombol panah/WASD (atau tombol arah di atas kalau di HP) -- dekati rekan kerja buat lihat tombol
        &quot;Chat&quot;.
      </p>
    </div>
  );
}

function DpadButton({ icon: Icon, onPress }: { icon: typeof ChevronUp; onPress: (down: boolean) => void }) {
  return (
    <button
      type="button"
      onPointerDown={() => onPress(true)}
      onPointerUp={() => onPress(false)}
      onPointerLeave={() => onPress(false)}
      className="grid h-11 w-11 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string, isSelf: boolean) {
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = isSelf ? 3 : 2;
  ctx.strokeStyle = isSelf ? "#ffffff" : "rgba(255,255,255,0.85)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(getInitials(label), x, y + 1);

  ctx.font = "600 10px system-ui, sans-serif";
  const text = label.length > 18 ? `${label.slice(0, 17)}…` : label;
  const padding = 6;
  const textW = ctx.measureText(text).width;
  const plateW = textW + padding * 2;
  const plateY = y + PLAYER_RADIUS + 4;
  ctx.fillStyle = isSelf ? "rgba(124,58,237,0.92)" : "rgba(15,23,42,0.78)";
  roundRect(ctx, x - plateW / 2, plateY, plateW, 16, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, plateY + 8);
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  opts: {
    onlineIds: string[];
    remotePositions: Map<string, RemotePos>;
    selfPos: { x: number; y: number };
    currentUser: CurrentUser;
    rosterById: Map<string, OfficeRosterEntry>;
  }
) {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  ctx.fillStyle = "#eef2f7";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (const room of ROOMS) {
    ctx.fillStyle = room.floorColor;
    ctx.fillRect(room.rect.x, room.rect.y, room.rect.w, room.rect.h);
    ctx.strokeStyle = room.accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(room.rect.x + 1, room.rect.y + 1, room.rect.w - 2, room.rect.h - 2);
    ctx.fillStyle = room.accentColor;
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(room.label.toUpperCase(), room.rect.x + 10, room.rect.y + 8);
  }

  ctx.fillStyle = "#b45309";
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 1.5;
  for (const rect of OBSTACLES) {
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
    ctx.fill();
    ctx.stroke();
  }

  for (const id of opts.onlineIds) {
    if (id === opts.currentUser.id) continue;
    const entry = opts.rosterById.get(id);
    if (!entry) continue;
    const pos = opts.remotePositions.get(id);
    drawAvatar(ctx, pos?.x ?? SPAWN.x, pos?.y ?? SPAWN.y, DIVISION_COLORS[entry.division], entry.fullName, false);
  }

  drawAvatar(
    ctx,
    opts.selfPos.x,
    opts.selfPos.y,
    DIVISION_COLORS[opts.currentUser.division],
    `${opts.currentUser.fullName} (Kamu)`,
    true
  );
}

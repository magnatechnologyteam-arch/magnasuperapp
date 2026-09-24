"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Komponen tanda tangan digital in-house (canvas) -- bagian dari e-signature
 * yang dibangun sendiri (bukan provider berbayar seperti PrivyID/Digisign),
 * sesuai keputusan Owner. Dipakai di halaman portal publik `/portal/[token]`
 * untuk klien tanda tangan kontrak/serah-terima langsung di layar HP/laptop
 * mereka -- gambar hasil canvas dikirim sebagai PNG data URL, audit trail
 * (timestamp + IP + user agent) direkam di server (lihat `submitPortalSignature`).
 */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function pointerPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) setIsEmpty(false);
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas && !isEmpty) onChange(canvas.toDataURL("image/png"));
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full touch-none rounded-lg border-2 border-dashed border-slate-300 bg-white"
        style={{ aspectRatio: "5 / 2" }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {isEmpty ? "Gambar tanda tangan Anda di kotak ini" : "Tanda tangan tersimpan"}
        </span>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Bersihkan
        </button>
      </div>
    </div>
  );
}

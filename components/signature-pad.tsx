"use client";
import { useEffect, useRef } from "react";

const W = 600;
const H = 220;

/**
 * Handwritten signature on a canvas (finger, stylus or mouse). Reports a PNG data URL after each stroke, or null when
 * cleared. White background so the PNG prints the same on paper; fixed drawing size so every signature has the same
 * resolution whatever the phone. `resetKey` clears it from outside (after a save).
 */
export function SignaturePad({ label, clearLabel, onInk, resetKey = 0 }: { label: string; clearLabel: string; onInk: (dataUrl: string | null) => void; resetKey?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  function blank() {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = "#0b1f1c";
    g.lineWidth = 3;
    g.lineCap = "round";
    g.lineJoin = "round";
  }

  useEffect(() => {
    blank();
    onInk(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = point(e);
    const g = canvas.current?.getContext("2d");
    if (g && last.current) { g.beginPath(); g.arc(last.current.x, last.current.y, 1.5, 0, Math.PI * 2); g.fillStyle = "#0b1f1c"; g.fill(); }
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return;
    const g = canvas.current?.getContext("2d");
    if (!g) return;
    const p = point(e);
    g.beginPath();
    g.moveTo(last.current.x, last.current.y);
    g.lineTo(p.x, p.y);
    g.stroke();
    last.current = p;
  }

  function up() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    onInk(canvas.current?.toDataURL("image/png") ?? null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        width={W}
        height={H}
        role="img"
        aria-label={label}
        data-testid="signature-pad"
        className="block aspect-[60/22] w-full touch-none rounded-md border-2 border-dashed border-ink-300 bg-white"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
      />
      <button type="button" className="h-10 rounded-md px-3 text-sm text-ink-700 underline-offset-2 hover:underline" onClick={() => { blank(); onInk(null); }}>{clearLabel}</button>
    </div>
  );
}


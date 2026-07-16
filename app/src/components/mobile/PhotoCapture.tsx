import { useRef, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { MobileButton } from './MobileChrome';
import { useMobileSim } from './MobileShell';
import { pseudoSha256 } from '../../store/inspections';
import { useAuth } from '../../store/auth';
import type { InspectionPhoto } from '../../types/inspection';
import { cn } from '../../lib/utils';

// ============================================================================
// PhotoCapture — simulates a live camera capture event for the inspector.
//
// Doc 2 §5.4 & §8.3 require: live capture only, server-side stamping with
// Date · Time · GPS · Inspector AD identity, SHA-256 hash for tamper
// detection. Since a web preview can't access a real device camera reliably,
// the simulator paints a synthetic "photo" on a <canvas> with a building
// thumbnail-style background and overlays the stamp strip exactly as the
// real device would. The resulting data URL is then attached to the
// inspection record.
// ============================================================================

interface PhotoCaptureProps {
  open: boolean;
  buildingName: string;
  buildingCoords?: { lat: number; lng: number };
  defaultCaption?: string;
  onCapture: (photo: InspectionPhoto) => void;
  onClose: () => void;
}

export function PhotoCapture({ open, buildingName, buildingCoords, defaultCaption = '', onCapture, onClose }: PhotoCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const user = useAuth((s) => s.user);
  const { offline } = useMobileSim();
  const [caption, setCaption] = useState(defaultCaption);
  const [tick, setTick] = useState(0);     // forces redraw

  // Re-render the synthetic photo whenever the modal is opened or the user
  // hits "Retake" via tick increment.
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Sky → ground gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0,    '#7BB7E8');
    sky.addColorStop(0.55, '#C5D9E8');
    sky.addColorStop(0.65, '#D9C9A8');
    sky.addColorStop(1,    '#8B7050');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Pseudo-skyline silhouette - building blocks
    const seed = buildingName.length + tick;
    ctx.fillStyle = '#3D3D3D';
    let x = -20;
    while (x < w + 20) {
      const bw = 30 + ((seed * 7 + x) % 50);
      const bh = 80 + ((seed * 11 + x) % 240);
      ctx.fillRect(x, h * 0.6 - bh, bw, bh);
      // windows
      ctx.fillStyle = '#FFE0A0';
      for (let wy = h * 0.6 - bh + 12; wy < h * 0.6 - 8; wy += 12) {
        for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
          if ((wy + wx + seed) % 5 < 2) ctx.fillRect(wx, wy, 3, 4);
        }
      }
      ctx.fillStyle = '#3D3D3D';
      x += bw + 4;
    }

    // Ground sand
    ctx.fillStyle = '#8A7050';
    ctx.fillRect(0, h * 0.85, w, h * 0.15);

    // "Live · Camera" badge top-left
    ctx.fillStyle = 'rgba(220,38,38,0.9)';
    ctx.fillRect(12, 12, 86, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('● LIVE CAMERA', 17, 27);

    // Geo crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2 - 10);
    ctx.lineTo(w / 2, h / 2 + 10);
    ctx.moveTo(w / 2 - 10, h / 2);
    ctx.lineTo(w / 2 + 10, h / 2);
    ctx.stroke();

    // ---- STAMP STRIP (bottom) ----
    const stampH = 56;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, h - stampH, w, stampH);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const lat = (buildingCoords?.lat ?? 24.5) + (Math.random() - 0.5) * 0.0001;
    const lng = (buildingCoords?.lng ?? 54.4) + (Math.random() - 0.5) * 0.0001;
    const gpsStr = `${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`;

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${dateStr} · ${timeStr}`, 10, h - stampH + 16);
    ctx.font = 'normal 10px sans-serif';
    ctx.fillStyle = '#FFE0A0';
    ctx.fillText(`GPS ${gpsStr}`, 10, h - stampH + 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Inspector: ${user?.name ?? 'Unknown'} (AD ${user?.id ?? '—'})`, 10, h - stampH + 44);
    if (offline) {
      ctx.fillStyle = '#E89B4C';
      ctx.fillText('OFFLINE — stamp computed on device, validated server-side on sync', 10, h - stampH + 54);
    } else {
      ctx.fillStyle = '#22C55E';
      ctx.font = 'normal 9px sans-serif';
      ctx.fillText('Server-stamped · SHA-256 hash computed · immutable', 10, h - stampH + 54);
    }

    // Building name (top-right)
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(w - 180, 12, 168, 22);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(truncate(buildingName, 28), w - 174, 27);
  }, [open, tick, buildingName, buildingCoords, user, offline]);

  if (!open) return null;

  const handleCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const photo: InspectionPhoto = {
      id: nanoid(8),
      dataUrl,
      caption: caption.trim() || defaultCaption || 'Photo evidence',
      capturedAt: new Date().toISOString(),
      lat: buildingCoords?.lat ?? 24.5,
      lng: buildingCoords?.lng ?? 54.4,
      inspectorId: user?.id ?? 'unknown',
      inspectorName: user?.name ?? 'Unknown',
      hash: pseudoSha256(dataUrl),
    };
    onCapture(photo);
    setCaption('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-doe-xl">
        <div className="bg-ink-950 text-white px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-[12.5px] font-semibold">Live Photo Capture</div>
            <div className="text-[10.5px] text-white/60">Server-stamped · gallery upload disabled</div>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center text-white/80 hover:text-white">✕</button>
        </div>

        <div className="bg-neutral-100 grid place-items-center">
          <canvas ref={canvasRef} width={400} height={300} className="block w-full h-auto" />
        </div>

        <div className="p-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Caption · mandatory per photo</span>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={defaultCaption || 'What does this photo show?'}
              className="mt-1.5 w-full h-10 px-3 border border-neutral-200 rounded-lg text-[13px] focus:outline-none focus:border-doe-red"
            />
          </label>
          <div className="mt-3 flex items-center gap-2">
            <MobileButton variant="secondary" onClick={() => setTick((t) => t + 1)}>Retake</MobileButton>
            <MobileButton variant="primary" onClick={handleCapture} disabled={!caption.trim() && !defaultCaption} block>
              <CameraIcon /> Capture & Stamp
            </MobileButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function CameraIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}

// ===== A small inline thumbnail used in checklist / violation lists =====
export function PhotoThumb({ photo, onClick, onRemove }: { photo: InspectionPhoto; onClick?: () => void; onRemove?: () => void }) {
  return (
    <div className="relative shrink-0">
      <img
        src={photo.dataUrl}
        alt={photo.caption}
        onClick={onClick}
        className={cn('w-16 h-16 rounded-lg object-cover border border-neutral-200', onClick && 'cursor-pointer')}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-doe-red text-white text-[10px] grid place-items-center shadow"
          aria-label="Remove photo"
        >✕</button>
      )}
    </div>
  );
}

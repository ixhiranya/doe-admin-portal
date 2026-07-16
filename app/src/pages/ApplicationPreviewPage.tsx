// =============================================================================
// Application Preview — standalone certificate viewer
// -----------------------------------------------------------------------------
// Renders just the A4 certificate document for an application at its own URL:
//   /app/:appId/preview
//
// Purpose:
//   • Linkable / shareable view of any issued or in-progress certificate.
//   • Print-ready: clean chrome that the print-stylesheet hides via .no-print.
//   • Zoom + page-fit controls; the existing in-application Preview tab links
//     here via an "Open standalone" button.
//
// Routing: same browser tab (no target="_blank") so the back button returns to
// the application detail page.
// =============================================================================
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApps } from '../store/apps';
import { getService } from '../services/registry';
import {
  pickCertificateDocument, certificateFileName, getMaesVariantTag,
} from './ApplicationDetailPage';
import { cn } from '../lib/utils';

export function ApplicationPreviewPage() {
  const { appId } = useParams();
  const apps = useApps((s) => s.apps);
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(100);

  const app = apps.find((a) => a.id === appId);

  if (!app) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center max-w-md">
          <div className="text-4xl mb-2">🔎</div>
          <div className="font-display font-bold text-[15px] text-ink-950">Application not found</div>
          <div className="text-[12px] text-neutral-500 mt-1">Application <span className="font-mono">{appId ?? '—'}</span> doesn't exist or is no longer accessible.</div>
          <button onClick={() => navigate(-1)} className="mt-4 btn-primary">Go back</button>
        </div>
      </div>
    );
  }

  const svc = getService(app.serviceId);
  const moduleLabel =
    app.module === 'gas'  ? 'Gas System Company Registration' :
    app.module === 'hoe'  ? 'House Of Expertise Registration' :
    app.module === 'amc'  ? 'Annual Maintenance Contract' :
    app.module === 'coc'  ? 'Certificate of Completion' :
    app.module === 'maes' ? 'Materials Approval & Evaluation' :
    'No Objection Certificate';
  const fileName = certificateFileName(app);

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Top toolbar — hidden in print */}
      <div className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200 shadow-doe-xs">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Left: breadcrumb + back */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/app/${app.id}`}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-ink-950 hover:border-action-orange hover:text-action-orange-deep"
            >
              <ArrowLeftIcon /> Back to application
            </Link>
            <div className="min-w-0 hidden md:block">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500">{moduleLabel}{svc?.action ? ` · ${svc.action}` : ''}</div>
              <div className="text-[12.5px] font-semibold text-ink-950 truncate">
                <span className="font-mono">{app.applicationNumber}</span>
                <span className="text-neutral-300 mx-2">·</span>
                <span>{app.company.name}</span>
              </div>
            </div>
          </div>

          {/* Right: zoom + print + download */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-md border border-neutral-200 px-1 h-8">
              <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950" title="Zoom out"><ZoomOutIcon /></button>
              <span className="text-[11.5px] font-mono text-ink-950 tabular-nums px-1 min-w-[40px] text-center">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950" title="Zoom in"><ZoomInIcon /></button>
              <span className="w-px h-4 bg-neutral-200" />
              <button onClick={() => setZoom(100)} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950" title="Fit width"><FitIcon /></button>
            </div>
            <button
              onClick={() => window.print()}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-ink-950 hover:border-action-orange hover:text-action-orange-deep flex items-center gap-1.5"
              title="Print"
            >
              <PrintIcon /> Print
            </button>
            <button
              className="h-8 px-3 rounded-md bg-ink-950 text-white text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-90"
              title={`Download ${fileName}`}
            >
              <DownloadIcon /> Download
            </button>
          </div>
        </div>

        {/* Filename strip */}
        <div className="max-w-[1400px] mx-auto px-6 pb-3 flex items-center gap-2 text-[11.5px] text-neutral-500">
          <FileIcon />
          <span className="font-mono text-ink-950">{fileName}</span>
          <span className="text-neutral-300">·</span>
          <span>A4 · 1 page</span>
        </div>
      </div>

      {/* Certificate canvas — centred, scales with zoom */}
      <div className="px-6 py-8">
        <div className="flex justify-center">
          <div
            className={cn(
              'bg-white shadow-doe-lg rounded-sm origin-top transition-transform print:shadow-none print:rounded-none',
            )}
            style={{
              width: '794px',                       // A4 width @ 96dpi
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            {pickCertificateDocument(app, getMaesVariantTag(app.serviceId))}
          </div>
        </div>
      </div>

      {/* Print-only stylesheet — strip the chrome on print so the certificate
          fills the printed page. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================
function ArrowLeftIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>; }
function ZoomInIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>; }
function ZoomOutIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>; }
function FitIcon()       { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>; }
function PrintIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function DownloadIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function FileIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }

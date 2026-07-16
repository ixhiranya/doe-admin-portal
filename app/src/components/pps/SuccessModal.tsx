import { cn } from '../../lib/utils';

// Lightweight result modal reused across the submission/approval flow.
// Same overlay + card styling as the existing TransitionModal — no new patterns.
export function SuccessModal({
  open, title, message, onClose, tone = 'success', actionLabel = 'Done',
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  tone?: 'success' | 'danger' | 'info';
  actionLabel?: string;
}) {
  if (!open) return null;
  const palette =
    tone === 'danger' ? { bg: 'bg-danger-soft', fg: 'text-danger-500' } :
    tone === 'info'   ? { bg: 'bg-info-soft',   fg: 'text-info-500' } :
                        { bg: 'bg-success-soft', fg: 'text-success-500' };
  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-6">
      <div className="bg-white rounded-xl shadow-doe-lg w-[420px] max-w-full p-6 text-center">
        <div className={cn('w-12 h-12 rounded-full grid place-items-center mx-auto mb-3', palette.bg, palette.fg)}>
          {tone === 'danger' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : tone === 'info' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          )}
        </div>
        <h3 className="font-display text-[17px] font-bold text-ink-950 mb-1">{title}</h3>
        <p className="text-[12.5px] text-neutral-600 mb-5 leading-relaxed">{message}</p>
        <button onClick={onClose} className="btn-primary mx-auto">{actionLabel}</button>
      </div>
    </div>
  );
}

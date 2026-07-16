import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useT } from '../../i18n';

// ============================================================================
// SplashScreen — quiet, government-grade welcome card on a cream backdrop.
// Logo + bilingual brand wordmark + a thin progress bar. No heavy gradients.
// ============================================================================

export function SplashScreen() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const t = useT();

  useEffect(() => {
    const inspectorRoles = ['inspector', 'senior_inspector', 'section_head', 'regulation_team', 'director'];
    const isAuthed = !!user && inspectorRoles.includes(user.role);
    const tt = setTimeout(() => {
      navigate(isAuthed ? '/mobile/home' : '/mobile/signin', { replace: true });
    }, 1600);
    return () => clearTimeout(tt);
  }, [navigate, user]);

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center px-8 text-center relative text-white overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(155deg, #161B23 0%, #0B0E12 60%, #1A0E13 100%)' }}
    >
      {/* Brand glow */}
      <div className="absolute -top-16 -end-16 w-72 h-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(200,16,46,0.32), transparent 70%)' }} />
      <div className="absolute -bottom-16 -start-12 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.18), transparent 70%)' }} />

      {/* DoE crest in a white card */}
      <div className="relative w-24 h-24 rounded-[26px] bg-white ring-1 ring-white/15 shadow-[0_18px_40px_-12px_rgba(11,14,18,0.55)] grid place-items-center">
        <img src="/doe-logo.png" alt="DoE" className="w-16 h-16 object-contain" />
      </div>

      <div className="relative mt-7">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-white/55">
          {t('m.app.deptOfEnergy')}
        </div>
        <div
          className="text-[24px] font-bold text-white mt-2 tracking-[-0.018em] leading-[1.2]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('m.splash.tagline')}
        </div>
      </div>

      {/* Slim progress bar */}
      <div className="relative mt-8 w-40 h-[3px] rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-tamm-brand rounded-full splash-bar" />
      </div>

      <div className="relative text-[11px] text-white/55 mt-6">v1.0 · {t('m.splash.authorised')}</div>

      {/* UAE flag accent at the bottom */}
      <div className="absolute bottom-0 inset-x-0 h-1 flex">
        <span className="flex-1 bg-[#00732F]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-black" />
        <span className="flex-1 bg-tamm-brand" />
      </div>
      <style>{`
        @keyframes splashFill {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        html[dir='rtl'] .splash-bar { animation: splashFillRtl 1.4s ease-in-out forwards; }
        @keyframes splashFillRtl {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .splash-bar {
          animation: splashFill 1.4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

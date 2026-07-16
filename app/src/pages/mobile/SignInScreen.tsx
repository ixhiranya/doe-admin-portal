import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../store/auth';
import { SEED_USERS } from '../../store/seed';
import { useT } from '../../i18n';
import { TammButton, TammLangPill } from '../../components/mobile/Tamm';
import { cn } from '../../lib/utils';

// ============================================================================
// SignInScreen — TAMM-style sign-in. Cream background, single white card,
// clear separation between the brand block, account chooser and the primary
// UAE Pass action. No marketing skyline, no gradients — just government-grade
// clarity. Bilingual.
// ============================================================================

export function MobileSignInScreen() {
  const navigate = useNavigate();
  const switchTo = useAuth((s) => s.switchTo);
  const t = useT();

  const [mode, setMode] = useState<'choose' | 'consent' | 'ad' | 'signing'>('choose');
  const [picked, setPicked] = useState<string>('doe.inspector');
  const [pickerOpen, setPickerOpen] = useState(false);

  const [adUser, setAdUser] = useState('');
  const [adPass, setAdPass] = useState('');
  const [adError, setAdError] = useState<string | null>(null);

  const inspectorRoles = ['inspector', 'senior_inspector', 'section_head', 'regulation_team', 'director'];
  const accounts = SEED_USERS.filter((u) => inspectorRoles.includes(u.role));
  const pickedUser = accounts.find((u) => u.id === picked);

  const completeSignIn = (userId: string) => {
    setMode('signing');
    setTimeout(() => {
      switchTo(userId);
      navigate('/mobile/home', { replace: true });
    }, 1100);
  };

  return (
    <div className="h-full w-full bg-tamm-bg flex flex-col">
      {/* ── Brand block ────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-tamm-surface ring-1 ring-tamm-line grid place-items-center">
            <img src="/doe-logo.png" alt="DoE" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-tamm-subtle leading-tight">{t('m.app.deptOfEnergy')}</div>
            <div className="text-[13px] font-bold text-tamm-ink leading-tight mt-0.5" style={{ fontFamily: 'var(--font-display)' }}>
              {t('m.splash.tagline')}
            </div>
          </div>
        </div>
        <TammLangPill />
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 pb-5 flex flex-col">
        {mode === 'signing' ? (
          <div className="flex-1 grid place-items-center">
            <UaePassHandshake t={t} />
          </div>
        ) : mode === 'choose' ? (
          <ChooseStep
            t={t}
            picked={picked} setPicked={setPicked}
            pickedUser={pickedUser}
            accounts={accounts}
            pickerOpen={pickerOpen} setPickerOpen={setPickerOpen}
            onUaePass={() => setMode('consent')}
            onAd={() => setMode('ad')}
          />
        ) : mode === 'consent' ? (
          <ConsentStep
            t={t}
            pickedUser={pickedUser}
            onBack={() => setMode('choose')}
            onContinue={() => completeSignIn(picked)}
          />
        ) : (
          <AdStep
            t={t}
            adUser={adUser} setAdUser={setAdUser}
            adPass={adPass} setAdPass={setAdPass}
            adError={adError} setAdError={setAdError}
            inspectorRoles={inspectorRoles}
            onBack={() => setMode('choose')}
            onSignIn={(uid: string) => completeSignIn(uid)}
          />
        )}
      </div>

      {/* UAE flag accent at the bottom */}
      <div className="h-1 flex shrink-0">
        <span className="flex-1 bg-[#00732F]" />
        <span className="flex-1 bg-white" />
        <span className="flex-1 bg-black" />
        <span className="flex-1 bg-tamm-brand" />
      </div>
    </div>
  );
}

// ============================================================================
function ChooseStep({
  t, picked, setPicked, pickedUser, accounts, pickerOpen, setPickerOpen, onUaePass, onAd,
}: any) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero greeting */}
      <div className="mt-3">
        <h1 className="text-[28px] font-bold text-tamm-ink leading-[1.1] tracking-[-0.018em]" style={{ fontFamily: 'var(--font-display)' }}>
          {t('m.signin.welcomeBack')}
        </h1>
        <p className="text-[14px] text-tamm-subtle mt-2 leading-relaxed">
          {t('m.signin.intro')}
        </p>
      </div>

      {/* Account picker */}
      <div className="mt-7">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tamm-subtle mb-2">{t('m.signin.account')}</div>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full rounded-2xl bg-tamm-surface ring-1 ring-tamm-line p-3 flex items-center gap-3 text-start shadow-[0_1px_2px_rgba(50,32,8,0.04)]"
        >
          {pickedUser ? (
            <>
              <div className="w-10 h-10 rounded-full bg-tamm-field text-tamm-ink grid place-items-center font-bold text-[12px] ring-1 ring-tamm-line">
                {pickedUser.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-tamm-ink truncate">{pickedUser.name}</div>
                <div className="text-[11.5px] text-tamm-subtle capitalize">{pickedUser.role.replace(/_/g, ' ')}</div>
              </div>
            </>
          ) : (
            <div className="text-[13px] text-tamm-subtle flex-1">{t('m.signin.pickAccount')}</div>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={cn('text-tamm-subtle transition-transform', pickerOpen && 'rotate-180')}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {pickerOpen && (
          <div className="mt-2 rounded-2xl bg-tamm-surface ring-1 ring-tamm-line overflow-hidden shadow-[0_2px_6px_rgba(50,32,8,0.06)]">
            {accounts.map((u: any, idx: number) => (
              <button
                key={u.id}
                onClick={() => { setPicked(u.id); setPickerOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-3 text-start',
                  picked === u.id ? 'bg-tamm-brandSoft' : 'active:bg-tamm-field',
                  idx > 0 && 'border-t border-tamm-line',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-tamm-field text-tamm-ink grid place-items-center font-bold text-[10.5px]">
                  {u.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate text-tamm-ink">{u.name}</div>
                  <div className="text-[11px] text-tamm-subtle capitalize">{u.role.replace(/_/g, ' ')}</div>
                </div>
                {picked === u.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div className="mt-auto pt-6 space-y-2.5">
        <button
          onClick={onUaePass}
          disabled={!picked}
          className={cn(
            'w-full h-[54px] rounded-2xl bg-[#0F1117] text-white font-semibold text-[15px] flex items-center justify-center gap-2.5 active:scale-[0.99] transition',
            !picked && 'opacity-40 cursor-not-allowed',
          )}
        >
          <UaePassMark size={22} />
          <span>{t('m.signin.continueWith')}</span>
          <span className="font-bold" dir="ltr" style={{ color: '#FCC92F', letterSpacing: '0.5px' }}>UAE PASS</span>
        </button>

        <button
          onClick={onAd}
          disabled={!picked}
          className={cn(
            'w-full h-11 rounded-xl text-tamm-brand font-semibold text-[13.5px] active:scale-[0.99]',
            !picked && 'opacity-40 cursor-not-allowed',
          )}
        >
          {t('m.signin.useAd')}
        </button>

        <div className="text-[11px] text-center text-tamm-subtle leading-relaxed pt-1">
          {t('m.signin.legalLine1')} <span className="text-tamm-ink font-medium">{t('m.signin.legalLine2')}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
function ConsentStep({ t, pickedUser, onBack, onContinue }: any) {
  return (
    <div className="flex-1 flex flex-col">
      <button onClick={onBack} className="self-start mb-4 flex items-center gap-1 text-tamm-brand font-semibold text-[14.5px]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl-mirror"><polyline points="15 18 9 12 15 6"/></svg>
        {t('m.common.back')}
      </button>

      <div className="text-center mt-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#0F1117] grid place-items-center mb-4">
          <UaePassMark size={40} />
        </div>
        <h2 className="text-[22px] font-bold text-tamm-ink tracking-[-0.012em]" style={{ fontFamily: 'var(--font-display)' }}>
          {t('m.signin.consentTitle')}
        </h2>
        <p className="text-[13px] text-tamm-subtle mt-2 leading-relaxed max-w-[300px] mx-auto">
          {t('m.signin.consentBody')}
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-tamm-surface ring-1 ring-tamm-line p-4 text-start">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-tamm-subtle">{t('m.signin.signingInAs')}</div>
        <div className="text-[14px] font-bold text-tamm-ink mt-1">{pickedUser?.name}</div>
        <div className="text-[12px] text-tamm-subtle capitalize">{pickedUser?.role.replace(/_/g, ' ')} · {pickedUser?.id}</div>
      </div>

      <div className="mt-auto pt-6 space-y-2">
        <button
          onClick={onContinue}
          className="w-full h-[54px] rounded-2xl bg-[#0F1117] text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.99] transition"
        >
          {t('m.signin.continueToUaePass')} <span dir="ltr" style={{ color: '#FCC92F' }}>UAE PASS</span>
        </button>
        <button onClick={onBack} className="w-full h-11 text-tamm-subtle font-semibold text-[13.5px]">{t('m.common.cancel')}</button>
      </div>
    </div>
  );
}

// ============================================================================
function AdStep({ t, adUser, setAdUser, adPass, setAdPass, adError, setAdError, inspectorRoles, onBack, onSignIn }: any) {
  return (
    <div className="flex-1 flex flex-col">
      <button onClick={onBack} className="self-start mb-4 flex items-center gap-1 text-tamm-brand font-semibold text-[14.5px]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="rtl-mirror"><polyline points="15 18 9 12 15 6"/></svg>
        {t('m.common.back')}
      </button>

      <h2 className="text-[22px] font-bold text-tamm-ink tracking-[-0.012em] mt-2" style={{ fontFamily: 'var(--font-display)' }}>
        {t('m.signin.useAd')}
      </h2>
      <p className="text-[13px] text-tamm-subtle mt-2 leading-relaxed">
        {t('m.signin.adFallback')}
      </p>

      <div className="mt-5 rounded-2xl bg-tamm-surface ring-1 ring-tamm-line overflow-hidden">
        <input
          value={adUser}
          onChange={(e: any) => setAdUser(e.target.value)}
          placeholder={t('m.signin.adUsername')}
          className="w-full h-12 px-4 bg-transparent text-[14px] focus:outline-none placeholder:text-tamm-subtle border-b border-tamm-line"
        />
        <input
          type="password"
          value={adPass}
          onChange={(e: any) => setAdPass(e.target.value)}
          placeholder={t('m.signin.adPassword')}
          className="w-full h-12 px-4 bg-transparent text-[14px] focus:outline-none placeholder:text-tamm-subtle"
        />
      </div>
      {adError && (
        <div className="mt-3 text-[12px] text-tamm-brand bg-tamm-brandSoft rounded-xl p-2.5 font-medium">{adError}</div>
      )}

      <div className="mt-auto pt-6">
        <TammButton
          block size="lg"
          onClick={() => {
            const u = SEED_USERS.find((x: any) => x.id.toLowerCase() === adUser.trim().toLowerCase());
            if (!u || !inspectorRoles.includes(u.role)) { setAdError('No inspector account matches that username.'); return; }
            if (adPass !== 'manage') { setAdError('Incorrect password. Demo password is "manage".'); return; }
            setAdError(null);
            onSignIn(u.id);
          }}
        >{t('common.signIn')}</TammButton>
      </div>
    </div>
  );
}

// ============================================================================
function UaePassHandshake({ t }: { t: (k: any, p?: any) => string }) {
  return (
    <div className="text-center">
      <div className="mx-auto w-20 h-20 rounded-2xl bg-[#0F1117] grid place-items-center mb-5 relative">
        <UaePassMark size={44} />
        <div className="absolute inset-0 rounded-2xl border-2 border-[#FCC92F] animate-[pulseRing_1.4s_ease-in-out_infinite]" />
      </div>
      <div className="text-[16px] font-bold tracking-tight text-tamm-ink">{t('m.signin.verifying')}</div>
      <div className="text-[12px] text-tamm-subtle mt-1.5">{t('m.signin.handshake')}</div>
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="w-2 h-2 rounded-full bg-[#FCC92F] animate-[bounceDot_0.9s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <style>{`
        @keyframes pulseRing { 0%, 100% { opacity: 0.25; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes bounceDot { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-3px); } }
      `}</style>
    </div>
  );
}

function UaePassMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="UAE Pass">
      <rect width="32" height="32" rx="6" fill="#0F1117" />
      <path d="M9 8v10c0 3.866 3.134 7 7 7s7-3.134 7-7V8" stroke="#FCC92F" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="22" cy="9.5" r="1.5" fill="#FCC92F" />
    </svg>
  );
}

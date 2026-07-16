import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useInspections } from '../../store/inspections';
import { useLocale } from '../../store/locale';
import { useT } from '../../i18n';
import { TammScreen, TammCard, TammRow, TammDivider, TammButton } from '../../components/mobile/Tamm';
import { cn } from '../../lib/utils';

// ============================================================================
// MeScreen (TAMM redesign) — Profile / "Me" tab.
// Identity hero, activity stats, contact card, preferences card, security
// card, device card, sign out. All on the cream TAMM background.
// ============================================================================

export function MeScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const inspections = useInspections((s) => s.inspections);
  const locale = useLocale((s) => s.locale);
  const setLocale = useLocale((s) => s.setLocale);
  const t = useT();

  if (!user) return null;

  const mineCount = inspections.filter((i) => i.inspectorId === user.id).length;
  const approvedCount = inspections.filter((i) => i.inspectorId === user.id && i.status === 'approved').length;
  const escalatedCount = inspections.filter(
    (i) => i.inspectorId === user.id && (i.status === 'escalated' || i.status === 'in_review' || i.status === 'closed'),
  ).length;

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <TammScreen title={t('m.me.title')} largeTitle>
      {/* ── Identity hero ── */}
      <div className="px-5 mt-1">
        <div
          className="rounded-[20px] overflow-hidden text-white relative shadow-[0_14px_28px_rgba(50,32,8,0.18)]"
          style={{ backgroundImage: 'linear-gradient(135deg, #14101A 0%, #3D1B26 55%, #6E1A2C 100%)' }}
        >
          <div className="absolute -top-10 -end-10 w-36 h-36 rounded-full" style={{ background: 'radial-gradient(circle, rgba(232,155,76,0.28), transparent 70%)' }} />
          <div className="relative p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white/15 ring-2 ring-white/25 grid place-items-center text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-tamm-tint">{t('m.app.deptOfEnergy')}</span>
              </div>
              <div className="text-[18px] font-bold leading-tight mt-0.5 tracking-[-0.018em] truncate" style={{ fontFamily: 'var(--font-display)' }}>
                {user.name}
              </div>
              <div className="text-[12px] text-white/75 mt-0.5 capitalize">{user.role.replace(/_/g, ' ')}</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-tamm-green/25 ring-1 ring-tamm-green/40 text-white text-[10.5px] font-bold uppercase tracking-[0.14em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-tamm-green" />
                  UAE Pass verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity stats ── */}
      <div className="px-5 mt-4 grid grid-cols-3 gap-2">
        <StatTile value={mineCount.toString()}     label={t('m.me.inspectionsCompleted')} tone="ink" />
        <StatTile value={approvedCount.toString()} label="Approved" tone="green" />
        <StatTile value={escalatedCount.toString()} label="Escalated" tone="orange" />
      </div>

      {/* ── Contact ── */}
      <TammCard title="Contact" padding="none">
        <ContactRow label={t('m.me.email')}   value={user.email} />
        <TammDivider inset={false} />
        <ContactRow label={t('m.me.mobile')}  value={user.phone ?? '—'} />
        <TammDivider inset={false} />
        <ContactRow label={t('m.me.adId')}    value={user.id} />
        <TammDivider inset={false} />
        <ContactRow label={t('m.me.modules')} value={user.modules.map((m) => m.toUpperCase()).join(' · ')} />
      </TammCard>

      {/* ── Preferences ── */}
      <TammCard title="Preferences" padding="none">
        <div className="px-4">
          <TammRow
            leading={
              <span className="w-10 h-10 rounded-[12px] bg-tamm-infoSoft text-tamm-info grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m6.9 8h-3.4a17 17 0 0 0-1.1-4.9c1.95.66 3.58 2.55 4.5 4.9m-6.9-5.9c.6.95 1.27 2.55 1.7 5.9h-3.4c.43-3.35 1.1-4.95 1.7-5.9M4.26 14a8.05 8.05 0 0 1 0-4h3.92a16 16 0 0 0 0 4zm.82 2h3.4c.25 1.7.66 3.27 1.1 4.9-1.95-.66-3.58-2.55-4.5-4.9m3.4-8H5.08a8 8 0 0 1 4.5-4.9c-.44 1.63-.85 3.2-1.1 4.9M12 19.9c-.6-.95-1.27-2.55-1.7-5.9h3.4c-.43 3.35-1.1 4.95-1.7 5.9m2.13-7.9h-4.26a14 14 0 0 1 0-4h4.26a14 14 0 0 1 0 4m.32 6.9c.44-1.63.85-3.2 1.1-4.9h3.4a8 8 0 0 1-4.5 4.9m1.43-6.9a16 16 0 0 0 0-4h3.92a8.05 8.05 0 0 1 0 4z"/></svg>
              </span>
            }
            title="Language"
            value={
              <div className="inline-flex p-0.5 rounded-lg bg-tamm-field text-[11.5px] font-bold ring-1 ring-tamm-line">
                <button
                  onClick={() => setLocale('en')}
                  className={cn('px-2.5 h-6 rounded-md transition',
                    locale === 'en' ? 'bg-tamm-surface text-tamm-ink shadow-sm' : 'text-tamm-subtle')}
                >EN</button>
                <button
                  onClick={() => setLocale('ar')}
                  className={cn('px-2.5 h-6 rounded-md transition',
                    locale === 'ar' ? 'bg-tamm-surface text-tamm-ink shadow-sm' : 'text-tamm-subtle')}
                >عربي</button>
              </div>
            }
            hideChevron
          />
          <TammDivider inset />
          <TammRow
            leading={
              <span className="w-10 h-10 rounded-[12px] bg-tamm-tintSoft text-tamm-tint grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2m6-6V11c0-3.07-1.63-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1z"/></svg>
              </span>
            }
            title="Notifications"
            subtitle="Critical alerts · Section Head returns"
          />
          <TammDivider inset />
          <TammRow
            leading={
              <span className="w-10 h-10 rounded-[12px] bg-tamm-field text-tamm-ink grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 0 0-2 2v3h2V5h14v14H5v-3H3v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2"/><path d="M10.08 15.58 11.5 17l5-5-5-5-1.42 1.41L12.67 11H3v2h9.67z"/></svg>
              </span>
            }
            title="Theme"
            subtitle="System (light)"
            hideChevron
          />
        </div>
      </TammCard>

      {/* ── Security ── */}
      <TammCard title={t('m.me.security')} padding="none">
        <div className="px-4 py-3 text-[12.5px] text-tamm-subtle leading-snug">
          {t('m.me.securityBody')}
        </div>
        <TammDivider inset={false} />
        <div className="px-4">
          <TammRow
            leading={
              <span className="w-10 h-10 rounded-[12px] bg-tamm-greenSoft text-tamm-green grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5z"/></svg>
              </span>
            }
            title="Active Directory"
            subtitle="Internal sign-in · primary"
            value={<span className="w-2 h-2 rounded-full bg-tamm-green" />}
            hideChevron
          />
          <TammDivider inset />
          <TammRow
            leading={
              <span className="w-10 h-10 rounded-[12px] bg-tamm-ink grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="6" fill="#0F1117"/><path d="M9 8v10c0 3.866 3.134 7 7 7s7-3.134 7-7V8" stroke="#FCC92F" strokeWidth="2.6" strokeLinecap="round"/><circle cx="22" cy="9.5" r="1.5" fill="#FCC92F"/></svg>
              </span>
            }
            title="UAE Pass"
            subtitle="Federated identity"
            value={<span className="w-2 h-2 rounded-full bg-tamm-green" />}
            hideChevron
          />
        </div>
      </TammCard>

      {/* ── Device ── */}
      <TammCard title={t('m.me.device')} padding="none">
        <ContactRow label={t('m.me.appVersion')} value="v1.0 prototype" />
        <TammDivider inset={false} />
        <ContactRow label={t('m.me.mdm')}        value="Microsoft Intune" />
        <TammDivider inset={false} />
        <ContactRow label={t('m.me.outboxTtl')}  value="7 days" />
      </TammCard>

      {/* ── Sign out ── */}
      <div className="px-5 mt-5 mb-3">
        <TammButton
          block
          size="lg"
          variant="tinted"
          onClick={() => { logout(); navigate('/login'); }}
        >
          {t('m.me.signOut')}
        </TammButton>
      </div>

      <div className="h-4" />
    </TammScreen>
  );
}

function StatTile({
  value, label, tone,
}: {
  value: string;
  label: string;
  tone: 'ink' | 'green' | 'orange';
}) {
  const tones = {
    ink:    'bg-tamm-surface text-tamm-ink',
    green:  'bg-tamm-greenSoft text-tamm-green',
    orange: 'bg-tamm-tintSoft text-tamm-tint',
  };
  return (
    <div className={cn(
      'rounded-[14px] p-3 ring-1 ring-tamm-line shadow-[0_1px_2px_rgba(50,32,8,0.04)]',
      tones[tone],
    )}>
      <div className="text-[24px] font-bold leading-none tracking-tight tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] mt-1.5 opacity-85">{label}</div>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="text-[12.5px] text-tamm-subtle">{label}</div>
      <div className="text-[13px] font-semibold text-tamm-ink text-end truncate max-w-[60%]">{value}</div>
    </div>
  );
}

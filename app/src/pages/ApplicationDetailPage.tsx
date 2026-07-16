import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useApps } from '../store/apps';
import { getService } from '../services/registry';
import { getAvailableTransitions, getState, roleLabel } from '../engine/workflow';
import { formatAED, formatBytes, formatDate, formatDateTime } from '../lib/utils';
import { cn } from '../lib/utils';
import { AttachmentBox } from '../components/AttachmentBox';
import { ScoreGateBanner } from '../components/compliance/ScoreGateBanner';
import { scoreForApplication } from '../services/compliance/scoring';
import type { Application, TransitionDef } from '../types';

type TabId = 'company' | 'staff' | 'projects' | 'preview';

export function ApplicationDetailPage() {
  const { appId } = useParams();
  const user = useAuth((s) => s.user)!;
  const apps = useApps((s) => s.apps);
  const runTransition = useApps((s) => s.runTransition);
  const navigate = useNavigate();

  const app = apps.find((a) => a.id === appId);
  if (!app) return <div className="p-6">Application not found.</div>;
  const svc = getService(app.serviceId);
  if (!svc) return <div className="p-6">Service definition missing.</div>;
  const state = getState(svc, app.state)!;
  const available = getAvailableTransitions(svc, app, user);

  const [tab, setTab] = useState<TabId>('company');
  const [auditTab, setAuditTab] = useState<'audit' | 'comments'>('audit');
  const [pendingTransition, setPendingTransition] = useState<TransitionDef | null>(null);
  const [comment, setComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [internalNote, setInternalNote] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const appIdLocal = app.id;
  const moduleLabel =
    svc.module === 'gas' ? 'Gas Services' :
    svc.module === 'hoe' ? 'House of Expertise' :
    svc.module === 'amc' ? 'AMC' :
    svc.module === 'coc' ? 'COC' :
    'NOC';
  const subTitleLabel =
    svc.module === 'gas' ? 'Gas System Company Registration' :
    svc.module === 'hoe' ? 'House Of Expertise Registration' :
    svc.module === 'amc' ? 'Annual Maintenance Contract (Gas Systems)' :
    svc.module === 'coc' ? 'Certificate of Completion (Gas Systems)' :
    'No Objection Certificate (NOC)';
  const actionLabel = capitalize(svc.action);

  // Show staff/projects tabs only when the service form actually has those sections.
  const hasStaffSection    = svc.form.some((s) => s.id === 'tech-staff');
  const hasProjectsSection = svc.form.some((s) => s.id === 'ref-projects');

  const statusBanner = useMemo(() => bannerFor(state.category), [state.category]);

  function runAction(t: TransitionDef) {
    setError(null);
    setComment('');
    // Save Draft fires silently (no confirmation needed)
    if (t.id === 'save-draft') {
      const r = runTransition(appIdLocal, t.id, user);
      if (!r.ok) setError(r.error || 'Action failed.');
      return;
    }
    // Payment flow has its own modal
    if (t.id === 'pay-fee') { setPayOpen(true); return; }
    // Every other transition (approvals, returns, rejections, submissions)
    // opens the confirmation modal — comment is required only when the
    // service definition flags requiresComment, otherwise optional.
    setPendingTransition(t);
  }
  function confirmAction() {
    if (!pendingTransition) return;
    if (pendingTransition.requiresComment && !comment.trim()) {
      setError('Comments are required for this action.');
      return;
    }
    const r = runTransition(appIdLocal, pendingTransition.id, user, comment.trim() || undefined);
    if (!r.ok) { setError(r.error || 'Action failed.'); return; }
    setPendingTransition(null);
    setComment('');
  }
  function payNow() {
    setTimeout(() => {
      const r = runTransition(appIdLocal, 'pay-fee', user);
      if (!r.ok) setError(r.error || 'Payment failed.');
      setPayOpen(false);
    }, 500);
  }


  return (
    <div className="bg-neutral-25 min-h-screen">
      {/* ============== STICKY HEADER ============== */}
      <div className="bg-white border-b border-neutral-100 sticky top-[7rem] z-30">
        <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-5">
          <nav className="text-[11.5px] text-neutral-500 mb-2 flex items-center gap-1.5">
            <Link to={`/module/${svc.module}`} className="hover:text-doe-red">{moduleLabel}</Link>
            <Chev />
            <Link to={`/module/${svc.module}/${svc.action}`} className="hover:text-doe-red">{subTitleLabel}</Link>
            <Chev />
            <span>{actionLabel}</span>
            <Chev />
            <span className="text-ink-950 font-semibold">{app.applicationNumber}</span>
          </nav>

          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="font-mono text-[13px] tracking-wider text-doe-red font-semibold">{app.applicationNumber}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(app.applicationNumber)}
                  className="text-neutral-400 hover:text-ink-950"
                  title="Copy application number"
                  aria-label="Copy"
                >
                  <CopyIcon />
                </button>
                <StatusPill category={state.category} label={state.label} />
              </div>
              <h1 className="font-display text-[26px] font-bold text-ink-950 leading-[1.2]">
                {abbrev(app.company.name)} — {app.company.name}
              </h1>
              <div className="text-[12.5px] text-neutral-500 mt-1.5">
                {registrationCategoryLabel(app.category)} · Gas in building installation, maintenance &amp; operation
              </div>
            </div>

            <div className="flex items-start gap-8 flex-wrap">
              <MetaCol label="Submitted" value={formatDate(app.submittedOn)} />
              <MetaCol
                label="Submitted by"
                value={
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-info-soft text-info-500 grid place-items-center font-bold text-[10px]">
                      {(app.timeline.find((t) => t.byUserRole === 'applicant')?.byUserName || 'TU').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <span className="text-[12.5px] text-ink-950">{app.timeline.find((t) => t.byUserRole === 'applicant')?.byUserName || '—'}</span>
                  </div>
                }
              />
              {(state.category === 'issued' || state.category === 'approved') && (
                <MetaCol label="Issue Date" value={<span className="text-success-500 font-semibold">{formatDate(app.approvedOn)}</span>} />
              )}

              <div className="flex items-center gap-2 self-start mt-3">
                <button className="h-9 px-3.5 rounded-md bg-[#3F3F3F] text-white text-[12.5px] font-semibold hover:opacity-90 flex items-center gap-1.5">
                  <DownloadIcon /> Export
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="h-9 px-3.5 rounded-md bg-white border border-neutral-200 text-ink-950 text-[12.5px] font-semibold hover:bg-neutral-50 flex items-center gap-1.5"
                >
                  ‹ Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============== STATUS BANNER (with inline action buttons) ============== */}
      {statusBanner && (
        <div className={cn('border-b', statusBanner.bg)}>
          <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center gap-3 flex-wrap">
            <span className={cn('inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-bold leading-none flex-shrink-0', statusBanner.iconBg)}>
              {statusBanner.icon}
            </span>
            <span className={cn('text-[13px] leading-none', statusBanner.text)}>{statusBanner.message}</span>

            {/* Right-aligned action buttons */}
            {available.length > 0 && (
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {available.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => runAction(t)}
                    className={cn(
                      'h-8 px-3 rounded-md text-[12px] font-semibold whitespace-nowrap transition flex items-center gap-1.5',
                      t.variant === 'success' ? 'bg-success-500 text-white hover:opacity-90' :
                      t.variant === 'danger'  ? 'bg-danger-500 text-white hover:opacity-90' :
                      t.variant === 'warning' ? 'bg-warning-500 text-white hover:opacity-90' :
                      t.variant === 'secondary' ? 'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50' :
                      'bg-action-orange text-white hover:bg-action-orange-dark',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
                {(app.state === 'draft' || app.state === 'returned_to_applicant') && app.applicantUserId === user.id && (
                  <button
                    onClick={() => navigate(`/app/${app.id}/edit`)}
                    className="h-8 px-3 rounded-md text-[12px] font-semibold bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50"
                  >
                    Edit Application
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============== BODY ============== */}
      <div className="max-w-[1400px] mx-auto px-6 pt-8 pb-12 grid grid-cols-[1fr_340px] gap-7 items-start">
        <div className="space-y-7 min-w-0">
          {error && (
            <div className="card bg-danger-soft border-danger-500/30 p-3 text-[12.5px] text-danger-500">{error}</div>
          )}

          {/* Compliance score-to-action gate (SDD §3.3) — surfaced on every
              permit detail page. Always shown; the body text adapts to the
              current band so the operator sees what the next renewal /
              modification action would do. */}
          <ScoreGateBanner
            result={scoreForApplication(app)}
            actionLabel={svc.action === 'renew' ? 'renewal' : svc.action === 'modify' ? 'modification' : svc.action === 'issue' ? 'issuance' : 'this action'}
          />

          {/* Tab strip — wrapped in a white card so it reads as the container header.
              Tech Staff + Ref Projects tabs are only shown if the service has those
              repeatable sections in its form schema (NOC has neither). */}
          <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-sm overflow-hidden">
            <div className="border-b border-neutral-100 px-3 flex items-center gap-1">
              <TabHead id="company"  current={tab} onClick={setTab} icon={<BuildingIcon />} label={app.module === 'noc' || app.module === 'coc' ? 'Premises & Gas System' : 'Company Information'} />
              {hasStaffSection && <TabHead id="staff"    current={tab} onClick={setTab} icon={<UsersIcon />}   label={app.module === 'hoe' ? 'Engineer Details' : 'Technical Staff'} badge={app.technicalStaff.length} />}
              {hasProjectsSection && <TabHead id="projects" current={tab} onClick={setTab} icon={<FolderIcon />}  label="Reference Projects" badge={app.referenceProjects.length} />}
              <TabHead id="preview"  current={tab} onClick={setTab} icon={<DocIcon />}     label="Preview Document" />
            </div>

            <div className="p-5">
              {tab === 'company'  && <CompanyInfoTab app={app} svc={svc} />}
              {tab === 'staff'    && hasStaffSection    && <TechStaffTab  app={app} />}
              {tab === 'projects' && hasProjectsSection && <ProjectsTab   app={app} />}
              {tab === 'preview'  && <PreviewTab    app={app} />}
            </div>
          </div>

          {/* Submitter remarks */}
          <section>
            <SectionLabel label="Submitter Remarks" />
            <div className="bg-action-orange-soft/40 border border-action-orange/20 rounded-lg p-4 mt-2">
              <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-action-orange-deep mb-1.5">From the applicant</div>
              <p className="text-[12.5px] text-ink-950 leading-relaxed">
                {applicantRemarks(app)}
              </p>
            </div>
          </section>

          {/* Attachments — single, deduplicated hub aggregating every form
              section's attachments (Main Info, Systems & Equipments, etc.) so
              the polished count badge gives a true total. Schema-driven
              renderers no longer print these inline. */}
          {(() => {
            const attachmentSections = svc.form
              .filter((s) => (s.attachments?.length ?? 0) > 0)
              .map((s) => ({ id: s.id, title: s.title, atts: s.attachments ?? [] }));
            if (attachmentSections.length === 0) return null;
            return (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel label="Attachments" />
                  <div className="text-[11.5px] text-neutral-500">
                    <strong className="text-ink-950">{app.attachments.length}</strong> uploaded
                    <span className="text-neutral-300 mx-1.5">|</span>
                    <strong className="text-action-orange-deep">{Math.max(0, requiredAttachmentCount(svc, app) - app.attachments.length)}</strong> missing
                  </div>
                </div>
                <div className="space-y-4">
                  {attachmentSections.map((sec) => (
                    <div key={sec.id}>
                      {attachmentSections.length > 1 && (
                        <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1.5">
                          {sec.title}
                          <span className="text-neutral-300 mx-1.5">·</span>
                          <span className="text-neutral-400 normal-case tracking-normal">{sec.atts.length} item{sec.atts.length === 1 ? '' : 's'}</span>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {sec.atts.map((att, i) => {
                          const file = app.attachments.find((f) => f.defId === att.id);
                          const missing = !file;
                          return (
                            <div key={att.id} className={cn('rounded-lg border flex items-center gap-3 px-3 py-2.5', missing ? 'bg-warning-soft/30 border-warning-500/20' : 'bg-white border-neutral-100')}>
                              <div className={cn('w-7 text-center font-mono text-[11px] font-semibold', missing ? 'text-action-orange-deep' : 'text-neutral-500')}>{String(i + 1).padStart(2, '0')}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12.5px] font-semibold text-ink-950 truncate">{att.label}</div>
                                {missing ? (
                                  <div className="text-[11px] text-action-orange-deep flex items-center gap-1.5 mt-0.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-action-orange" />
                                    No Attachment Found
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-neutral-500 mt-0.5 flex items-center gap-1.5">
                                    <span className="font-mono bg-neutral-50 border border-neutral-100 rounded px-1.5 py-0.5">📎 {file.filename}</span>
                                    <span>·</span>
                                    <span>{formatBytes(file.size)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button disabled={missing} className={cn('w-7 h-7 rounded-md grid place-items-center', missing ? 'text-neutral-300' : 'text-neutral-500 hover:bg-neutral-50')} aria-label="View"><EyeIcon /></button>
                                <button disabled={missing} className={cn('w-7 h-7 rounded-md grid place-items-center', missing ? 'text-neutral-300' : 'text-neutral-500 hover:bg-neutral-50')} aria-label="Download"><DownloadIcon /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Audit history / Comments */}
          <section>
            <div className="flex items-center justify-between mb-3 border-b border-neutral-100">
              <div className="flex items-center gap-1">
                <AuditTabHead id="audit"    current={auditTab} onClick={setAuditTab} icon={<ClockIcon />} label="Audit History" badge={app.timeline.length} />
                <AuditTabHead id="comments" current={auditTab} onClick={setAuditTab} icon={<CommentIcon />} label="Comments"      badge={3} />
              </div>
              <div className="text-[10.5px] font-mono text-neutral-500">Persistent across tabs · time in GST (UTC+4)</div>
            </div>

            {auditTab === 'audit' && <AuditHistory app={app} svc={svc} />}
            {auditTab === 'comments' && (
              <CommentsThread
                newComment={newComment}
                setNewComment={setNewComment}
                internal={internalNote}
                setInternal={setInternalNote}
                user={{ name: user.name, role: roleLabel(user.role) }}
              />
            )}
          </section>
        </div>

        {/* ============== SIDEBAR ============== */}
        <aside className="space-y-4 sticky top-[12rem] self-start">
          <CompanyCard app={app} />
          <CompanySnapshot app={app} />
          <PrimaryContactCard app={app} />
          <ReviewSummary app={app} />
        </aside>
      </div>

      {/* ----- Confirmation + Comment modal ----- */}
      {pendingTransition && (
        <Modal title={pendingTransition.label} onClose={() => setPendingTransition(null)}>
          <ConfirmDialog
            transition={pendingTransition}
            comment={comment}
            setComment={setComment}
            onCancel={() => setPendingTransition(null)}
            onConfirm={confirmAction}
            user={{ name: user.name, role: roleLabel(user.role) }}
            app={app}
          />
        </Modal>
      )}

      {/* ----- Payment modal ----- */}
      {payOpen && (
        <Modal title="Pay Registration Fee" onClose={() => setPayOpen(false)}>
          <div className="text-center py-3">
            <div className="text-[11px] font-sans uppercase tracking-wider text-neutral-500">Amount due</div>
            <div className="font-display text-[36px] font-bold text-ink-950 mt-1">{formatAED(svc.feeAmount ?? 0)}</div>
            <div className="text-[11.5px] text-neutral-500 mt-2">
              You will be redirected to the Payment Gateway. <br />
              Upon successful payment your Certificate will be generated automatically.
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50" onClick={() => setPayOpen(false)}>Cancel</button>
            <button className="btn bg-action-orange text-white hover:bg-action-orange-dark ml-auto" onClick={payNow}>Pay {formatAED(svc.feeAmount ?? 0)}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ====================================================================== Header pieces

function StatusPill({ category, label }: { category: string; label: string }) {
  const map: Record<string, string> = {
    issued: 'bg-success-soft text-success-500 border-success-500/30',
    approved: 'bg-success-soft text-success-500 border-success-500/30',
    pending: 'bg-info-soft text-info-500 border-info-500/30',
    returned: 'bg-warning-soft text-warning-500 border-warning-500/30',
    rejected: 'bg-danger-soft text-danger-500 border-danger-500/30',
    cancelled: 'bg-neutral-100 text-neutral-500 border-neutral-200',
    draft: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    payment: 'bg-action-orange-soft text-action-orange-deep border-action-orange/30',
  };
  const cls = map[category] || 'bg-neutral-100 text-neutral-700 border-neutral-200';
  return (
    <span className={cn('inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10.5px] font-semibold uppercase tracking-wider border', cls)}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function MetaCol({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">{label}</div>
      <div className="text-[13px] text-ink-950 font-semibold">{value}</div>
    </div>
  );
}

function bannerFor(category: string) {
  switch (category) {
    case 'issued':
      return { bg: 'bg-success-soft/50 border-success-500/20', iconBg: 'bg-success-500 text-white', icon: '✓', text: 'text-success-500 font-semibold', message: 'Application Issued — no further action required' };
    case 'approved':
      return { bg: 'bg-success-soft/40 border-success-500/20', iconBg: 'bg-success-500 text-white', icon: '✓', text: 'text-success-500 font-semibold', message: 'Application Approved — awaiting payment' };
    case 'pending':
      return { bg: 'bg-info-soft/50 border-info-500/20', iconBg: 'bg-info-500 text-white', icon: '⏱', text: 'text-info-500 font-semibold', message: 'In Review — awaiting reviewer action' };
    case 'returned':
      return { bg: 'bg-warning-soft/50 border-warning-500/20', iconBg: 'bg-warning-500 text-white', icon: '!', text: 'text-warning-500 font-semibold', message: 'Returned for modification — applicant must resubmit' };
    case 'rejected':
      return { bg: 'bg-danger-soft/40 border-danger-500/20', iconBg: 'bg-danger-500 text-white', icon: '✕', text: 'text-danger-500 font-semibold', message: 'Application Rejected' };
    case 'payment':
      return { bg: 'bg-action-orange-soft/50 border-action-orange/20', iconBg: 'bg-action-orange text-white', icon: '$', text: 'text-action-orange-deep font-semibold', message: 'Fee payment required — please complete payment' };
    default: return null;
  }
}

function TabHead({ id, current, onClick, icon, label, badge }: { id: TabId; current: TabId; onClick: (id: TabId) => void; icon: React.ReactNode; label: string; badge?: number }) {
  const active = current === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'h-12 px-4 flex items-center gap-2 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition',
        active ? 'border-action-orange text-ink-950' : 'border-transparent text-neutral-500 hover:text-ink-950',
      )}
    >
      <span className={cn(active ? 'text-action-orange' : 'opacity-70')}>{icon}</span>
      {label}
      {badge != null && (
        <span className={cn('ml-0.5 px-1.5 h-[18px] rounded-full text-[10.5px] font-semibold inline-flex items-center justify-center', active ? 'bg-action-orange text-white' : 'bg-neutral-100 text-neutral-700')}>{badge}</span>
      )}
    </button>
  );
}

function AuditTabHead({ id, current, onClick, icon, label, badge }: { id: 'audit' | 'comments'; current: 'audit' | 'comments'; onClick: (id: 'audit' | 'comments') => void; icon: React.ReactNode; label: string; badge?: number }) {
  const active = current === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'h-9 px-3 flex items-center gap-1.5 text-[12.5px] font-semibold border-b-2 -mb-px',
        active ? 'border-action-orange text-ink-950' : 'border-transparent text-neutral-500 hover:text-ink-950',
      )}
    >
      <span className="opacity-70">{icon}</span>
      {label}
      {badge != null && (
        <span className={cn('ml-1 px-1.5 h-4 rounded-full text-[10px] font-semibold grid place-items-center', active ? 'bg-action-orange text-white' : 'bg-neutral-100 text-neutral-700')}>{badge}</span>
      )}
    </button>
  );
}

// ====================================================================== Tab contents

function CompanyInfoTab({ app, svc }: { app: Application; svc: import('../types').ServiceDefinition }) {
  // For Gas / HOE: keep the polished "Company Information" presentation
  // (Registration → Ownership → Representative → Address blocks) since the
  // BRD field set maps directly to canonical `app.company.*`.
  if (app.module === 'gas' || app.module === 'hoe') {
    return <GasHoeCompanyInfo app={app} />;
  }
  // For NOC (and any future module that doesn't use canonical company fields):
  // walk the service form schema and render each non-repeatable section.
  return <SchemaDrivenSections app={app} svc={svc} />;
}

function GasHoeCompanyInfo({ app }: { app: Application }) {
  const c = app.company;
  return (
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="Registration Details" />
          <span className="text-[11.5px] text-success-500 flex items-center gap-1"><span>✓</span> All fields complete</span>
        </div>
        <Card>
          <div className="grid grid-cols-3 gap-x-8 gap-y-4">
            <Field label="Registration Category"  value={registrationCategoryLabel(app.category)} />
            <Field label="Commercial Permit"       value={c.tradePermitNumber} mono />
            <Field label="Establishment Name"      value={c.name} />
            <Field label="Business Activity"       value={c.businessActivity} />
            <Field label="Company Type"            value={c.legalStatus} />
            <Field label="Establishment Date"      value={formatDate(c.establishmentDate)} />
            <Field label="Trade Permit Issued"     value={formatDate(c.tradePermitIssueDate)} />
            <Field label="Trade Permit Expiry"     value={<span className="flex items-center gap-2">{formatDate(c.tradePermitExpiryDate)}<span className="chip-sm bg-success-soft text-success-500">{monthsUntil(c.tradePermitExpiryDate)} mo</span></span>} />
            <Field label="Permit Status"           value={<span className="text-success-500 font-semibold">Active</span>} />
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="Ownership Details" />
          <span className="text-[11.5px] text-success-500 flex items-center gap-1"><span>✓</span> Verified</span>
        </div>
        <Card>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Owner Name (EN)" value={c.ownerName} />
            <Field label="Owner Name (AR)" value={<span dir="rtl" className="font-arabic">{owerArabic(c.ownerName)}</span>} align="right" />
            <Field label="Nationality (EN)" value={c.nationality} />
            <Field label="Nationality (AR)" value={<span dir="rtl">الإمارات العربية المتحدة</span>} align="right" />
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="Representative Details" />
        </div>
        <Card>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Authorized Representative" value={c.authorizedRepresentative} />
            <Field label="Contact Number"            value={c.phone} mono />
            <Field label="Email"                     value={<a className="text-info-500 hover:underline" href={`mailto:${c.email}`}>{c.email}</a>} />
            <Field label="Website"                   value={c.website ? <a className="text-info-500 hover:underline" href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a> : '—'} />
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel label="Address Information" />
        </div>
        <Card>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Office Address"     value={c.address} />
            <Field label="Workshop Address"   value={app.workshopAddress || '—'} />
            <Field label="Branch Address"     value={app.branchAddress || '—'} />
            <Field label="Area of Operations" value={app.areaOfOperations || 'Abu Dhabi Emirate'} />
          </div>
        </Card>
      </section>
    </div>
  );
}

// Generic schema-driven renderer used for NOC (and any future module whose
// fields don't map to canonical company.* attributes). Walks the service's
// non-repeatable form sections and renders each field's value from
// `app.fieldValues[field.id]`, with a small set of canonical fall-backs.
function SchemaDrivenSections({ app, svc }: { app: Application; svc: import('../types').ServiceDefinition }) {
  const sections = svc.form.filter((s) => !s.repeatable);
  const isMaes = app.module === 'maes';
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section key={section.id}>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel label={section.title} />
          </div>
          <Card>
            {section.description && (
              <div className="text-[11.5px] text-neutral-500 mb-3 -mt-1">{section.description}</div>
            )}
            {section.fields.length > 0 && (
              <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                {section.fields.map((f) => (
                  <Field
                    key={f.id}
                    label={f.label}
                    value={resolveFieldValue(app, f.id)}
                    mono={f.id === 'companyLicense' || f.id === 'buildingNo' || f.id === 'plotNo' || f.id === 'tpiCocRef' || f.id === 'ownerEid'}
                  />
                ))}
              </div>
            )}
            {/* Attachments intentionally NOT rendered inline here — they are
                aggregated in the single "Attachments" hub below the tab card to
                avoid duplication across sections. */}
          </Card>
        </section>
      ))}

      {/* MAES — per-material list and the derived Certificate Expiry Date,
          per SDD §1.3.4 (Per-Material Expiry) and §1.3.5.2 (downloadable list).
          Renders the same data the certificate preview uses, so reviewers see
          exactly what will go onto the issued document. */}
      {isMaes && app.materials && app.materials.length > 0 && (
        <MaesMaterialsSection app={app} />
      )}
    </div>
  );
}

function MaesMaterialsSection({ app }: { app: Application }) {
  const materials = app.materials ?? [];
  const activeRows = materials.filter((m) => m.status !== 'cancelled' && m.status !== 'revoked');
  // Certificate-level Expiry Date = MAX of active rows' per-material expiry.
  const maxExpiry = activeRows.length > 0
    ? activeRows.map((m) => m.expiryDate).sort().slice(-1)[0]
    : materials.map((m) => m.expiryDate).sort().slice(-1)[0];
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <SectionLabel label="Systems & Equipments · Registered Materials" />
        <div className="text-[11.5px] text-neutral-500">
          <strong className="text-ink-950">{materials.length}</strong> rows
          <span className="text-neutral-300 mx-1.5">|</span>
          <strong className="text-ink-950">{activeRows.length}</strong> active
          <span className="text-neutral-300 mx-1.5">|</span>
          Cert Expiry <strong className="text-ink-950">{formatDate(maxExpiry)}</strong>
        </div>
      </div>
      <div className="text-[11.5px] text-neutral-500 mb-3">
        Every material on a MAES Registration carries its own Expiry Date. The certificate-level
        Expiry Date is derived automatically as <span className="font-mono">MAX(material expiry dates)</span> — see SDD §1.3.4.3.
      </div>
      <div className="space-y-2">
        {materials.map((m, i) => (
          <MaesMaterialRowCard key={m.id} m={m} index={i} today={today} />
        ))}
      </div>
    </section>
  );
}

// Horizontal row card for a single MAES material — clean 2-zone layout.
//   ── Left content (flex-1):
//        Line 1: Commercial Name (h3) with subtle index prefix
//        Line 2: compact spec line — Type · Model · Country
//        Line 3: narrative testing line — "Tested by X — inspection type"
//        Line 4: narrative certification line — "Certified by Y · C.O.C ref"
//   ── Right rail (fixed width): status pill stacked above the Expires stat.
// All nine SDD fields still present, but rewritten as prose to halve the
// visual noise of the previous label-grid layout.
function MaesMaterialRowCard({ m, index, today }: { m: import('../types').MaesMaterial; index: number; today: string }) {
  const isExpired = m.status === 'active' && m.expiryDate < today;
  const s =
    m.status === 'cancelled' ? { txt: 'Cancelled',       pill: 'bg-doe-red-soft text-doe-red',                    stripe: 'bg-doe-red',           strike: true,  expiryTone: 'text-doe-red' } :
    m.status === 'revoked'   ? { txt: 'Revoked',         pill: 'bg-doe-red-soft text-doe-red',                    stripe: 'bg-doe-red',           strike: true,  expiryTone: 'text-doe-red' } :
    m.status === 'pending-renewal' ? { txt: 'Pending Renewal', pill: 'bg-action-orange-soft text-action-orange-deep', stripe: 'bg-action-orange', strike: false, expiryTone: 'text-action-orange-deep' } :
    isExpired                ? { txt: 'Expired',         pill: 'bg-warning-soft text-warning-500',                stripe: 'bg-warning-500',       strike: false, expiryTone: 'text-action-orange-deep' } :
                              { txt: 'Active',           pill: 'bg-success-soft text-success-500',                stripe: 'bg-success-500',       strike: false, expiryTone: 'text-ink-950' };

  return (
    <div className={cn('relative bg-white border border-neutral-200 rounded-lg overflow-hidden hover:border-neutral-300 transition', s.strike && 'opacity-90')}>
      {/* Left status stripe */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', s.stripe)} />

      <div className="pl-6 pr-5 py-4 flex items-start gap-5">
        {/* ── Left content (flex-1) ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title line — index + commercial name */}
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="font-mono text-[10px] text-neutral-400 font-semibold tabular-nums flex-shrink-0">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className={cn('text-[14px] font-semibold text-ink-950 leading-tight truncate', s.strike && 'line-through')}>
              {m.commercialName}
            </h3>
          </div>

          {/* Compact spec line — material type · model · country */}
          <div className="text-[11.5px] text-neutral-500 mt-0.5 ml-[26px] truncate">
            {m.materialType}
            <span className="text-neutral-300 mx-1.5">·</span>
            <span className="font-mono text-neutral-600">{m.modelNo}</span>
            <span className="text-neutral-300 mx-1.5">·</span>
            {m.manufacturerCountry}
          </div>

          {/* Narrative testing + certification lines */}
          <div className="mt-2 ml-[26px] text-[11px] text-neutral-600 leading-relaxed space-y-0.5">
            <div>
              <span className="text-neutral-400">Tested by</span>{' '}
              <span className="text-ink-950 font-medium">{m.testingLabs}</span>{' '}
              <span className="text-neutral-400">—</span>{' '}
              <span className="text-ink-950">{m.labInspectionType}</span>
            </div>
            <div>
              <span className="text-neutral-400">Certified by</span>{' '}
              <span className="text-ink-950 font-medium">{m.certificationBody}</span>
              <span className="text-neutral-300 mx-1.5">·</span>
              <span className="text-neutral-400">C.O.C</span>{' '}
              <span className="font-mono text-neutral-700">{m.intlSafetyCertNo}</span>
            </div>
          </div>
        </div>

        {/* ── Right rail — status + expiry stack ─────────────────────────── */}
        <div className="flex-shrink-0 text-right pl-5 border-l border-neutral-100 min-w-[120px]">
          <span className={cn('inline-flex items-center h-5 px-2 rounded text-[9.5px] font-semibold uppercase tracking-wider', s.pill)}>
            {s.txt}
          </span>
          <div className="mt-2.5">
            <div className="text-[9px] font-sans uppercase tracking-[0.16em] text-neutral-400 leading-none">Expires</div>
            <div className={cn('text-[14px] font-semibold tabular-nums mt-1', s.expiryTone, s.strike && 'line-through')}>
              {formatDate(m.expiryDate)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function resolveFieldValue(app: Application, fieldId: string): React.ReactNode {
  // 1. Generic per-field map populated by the seed / form submission
  const fv = app.fieldValues?.[fieldId];
  if (fv !== undefined && fv !== '') {
    // Render dates nicely if they look ISO-ish
    if (/^\d{4}-\d{2}-\d{2}/.test(fv)) return formatDate(fv);
    return fv;
  }
  // 2. Canonical company-field fall-backs (so Gas/HOE still work even when
  //    rendered through this generic path in the future)
  const c = app.company;
  switch (fieldId) {
    case 'companyLicense':    return c.tradePermitNumber;
    case 'companyName':       return c.name;
    case 'ownerName':         return c.ownerName;
    case 'nationality':       return c.nationality;
    case 'representative':    return c.authorizedRepresentative;
    case 'businessActivity':  return c.businessActivity;
    case 'legalStatus':       return c.legalStatus;
    case 'establishmentDate': return formatDate(c.establishmentDate);
    case 'permitIssueDate':   return formatDate(c.tradePermitIssueDate);
    case 'permitExpiryDate':  return formatDate(c.tradePermitExpiryDate);
    case 'permitType':        return c.legalStatus;
    case 'address':           return c.address;
    case 'poBox':             return c.poBox;
    case 'phone':             return c.phone;
    case 'email':             return <a className="text-info-500 hover:underline" href={`mailto:${c.email}`}>{c.email}</a>;
    case 'website':           return c.website ? <a className="text-info-500 hover:underline" href={c.website} target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a> : '—';
    case 'branchAddress':     return app.branchAddress || '—';
    case 'workshopAddress':   return app.workshopAddress || '—';
    case 'areaOfOperations':  return app.areaOfOperations || '—';
    case 'category':          return registrationCategoryLabel(app.category);
    default:                  return '—';
  }
}

function TechStaffTab({ app }: { app: Application }) {
  const [q, setQ] = useState('');
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const allStaff = app.technicalStaff.length > 0 ? app.technicalStaff : (SAMPLE_STAFF as any[]);
  const staff = allStaff.filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.emiratesId.includes(q));
  const verified = staff.filter((s) => s.staffType === 'Engineer').length;
  const pending = staff.length - verified;

  return (
    <div className="space-y-4">
      {/* Header: stats + view toggle + search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-success-soft text-success-500 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500" /> {verified} Verified
          </span>
          {pending > 0 && (
            <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-warning-soft text-warning-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-warning-500" /> {pending} Pending
            </span>
          )}
          <span className="text-neutral-500">· Total <strong className="text-ink-950">{staff.length}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-100 rounded-md p-0.5">
            <button onClick={() => setView('cards')} className={cn('px-2 h-7 text-[11px] font-semibold rounded transition', view === 'cards' ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500')}><GridIcon /></button>
            <button onClick={() => setView('list')}  className={cn('px-2 h-7 text-[11px] font-semibold rounded transition', view === 'list'  ? 'bg-white shadow-doe-xs text-ink-950' : 'text-neutral-500')}><ListIcon2 /></button>
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="h-9 pl-8 pr-3 rounded-md border border-neutral-200 bg-white text-[12.5px] w-[240px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
          </div>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-3 gap-3">
          {staff.map((s, i) => <StaffCard key={i} s={s} />)}
          {staff.length === 0 && <EmptyHint message="No staff match your search." />}
        </div>
      ) : (
        <StaffTable staff={staff} />
      )}
    </div>
  );
}

function StaffCard({ s }: { s: any }) {
  const verified = s.staffType === 'Engineer';
  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs hover:shadow-doe-md transition overflow-hidden">
      {/* Color band by role */}
      <div className={cn('h-1', verified ? 'bg-success-500' : 'bg-warning-500')} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar name={s.name} size={42} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-ink-950 truncate">{s.name}</div>
            <div className="text-[11.5px] text-neutral-500 mt-0.5 truncate">{s.position}{s.technicianType ? ` · ${s.technicianType}` : ''}</div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider', verified ? 'bg-success-soft text-success-500' : 'bg-warning-soft text-warning-500')}>
                {verified ? <CheckSm /> : <PendSm />} {verified ? 'Verified' : 'Pending'}
              </span>
              <span className="inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-info-soft text-info-500">
                {s.staffType}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 space-y-2 text-[12px]">
          <StaffDetail icon={<FlagIcon />}      label="Nationality"  value={s.nationality} />
          <StaffDetail icon={<IdIcon />}        label="Emirates ID"  value={<span className="font-mono">{s.emiratesId}</span>} />
          <StaffDetail icon={<PhoneIcon />}     label="Mobile"        value={<span className="font-mono">{s.phone}</span>} />
          <StaffDetail icon={<MailIcon />}      label="Email"         value={<a href={`mailto:${s.email}`} className="text-info-500 hover:underline truncate">{s.email}</a>} />
          <StaffDetail icon={<GradCapIcon />}   label="Qualification" value={s.education} />
        </div>
      </div>
    </div>
  );
}

function StaffDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded grid place-items-center bg-neutral-50 text-neutral-500 mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-400 leading-none">{label}</div>
        <div className="text-[12px] text-ink-950 mt-0.5 truncate">{value}</div>
      </div>
    </div>
  );
}

function StaffTable({ staff }: { staff: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
      <table className="w-full">
        <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
          <tr>
            <th className="text-left px-4 py-2.5">Staff</th>
            <th className="text-left px-4 py-2.5">Role</th>
            <th className="text-left px-4 py-2.5">Contact</th>
            <th className="text-left px-4 py-2.5">Qualification</th>
            <th className="text-left px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s, i) => {
            const verified = s.staffType === 'Engineer';
            return (
              <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-25">
                <td className="p-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} size={32} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink-950">{s.name}</div>
                      <div className="text-[10.5px] text-neutral-500 flex items-center gap-1.5">
                        <span className="font-mono">{s.emiratesId}</span>
                        <span className="text-neutral-300">·</span>
                        <span>{s.nationality}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <div className="text-[12px] text-ink-950">{s.position}</div>
                  <div className="text-[10.5px] text-neutral-500">{s.staffType}{s.technicianType ? ` · ${s.technicianType}` : ''}</div>
                </td>
                <td className="p-2">
                  <div className="text-[12px] text-ink-950 font-mono">{s.phone}</div>
                  <a href={`mailto:${s.email}`} className="text-[10.5px] text-info-500 hover:underline">{s.email}</a>
                </td>
                <td className="p-2 text-[12px] text-ink-950">{s.education}</td>
                <td className="p-2">
                  <span className={cn('inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider', verified ? 'bg-success-soft text-success-500' : 'bg-warning-soft text-warning-500')}>
                    {verified ? <CheckSm /> : <PendSm />} {verified ? 'Verified' : 'Pending'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTab({ app }: { app: Application }) {
  const projects = app.referenceProjects.length > 0
    ? app.referenceProjects.map((p) => ({ ...p, subtitle: '', type: 'Installation' }))
    : SAMPLE_PROJECTS;
  const [q, setQ] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtered = projects.filter((p: any) =>
    !q || p.projectName.toLowerCase().includes(q.toLowerCase()) || p.clientName.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Top bar: count on left, search on right */}
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] text-neutral-500">
          <strong className="text-ink-950">{filtered.length}</strong> of {projects.length} projects
          {projects.some((p: any) => deriveStatus(p) === 'Mobilising') && (
            <span className="ml-3 inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[10px] font-semibold text-warning-500 bg-warning-soft">
              <PendSm /> 1 not yet started
            </span>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="h-9 pl-9 pr-3 rounded-md border border-neutral-200 bg-white text-[12.5px] w-[280px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15"
          />
        </div>
      </div>

      {/* Clean table */}
      <div className="bg-white rounded-xl border border-neutral-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-3">Project</th>
              <th className="text-left px-5 py-3">Client</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Start</th>
              <th className="text-left px-5 py-3">End</th>
              <th className="text-left px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p: any, i: number) => (
              <ProjectTableRow
                key={i}
                p={p}
                expanded={expandedId === `row-${i}`}
                onToggle={() => setExpandedId(expandedId === `row-${i}` ? null : `row-${i}`)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[12.5px] text-neutral-500">
                  No projects match "{q}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function deriveStatus(p: any): 'Completed' | 'Ongoing' | 'Mobilising' {
  const now = Date.now();
  const start = p.startDate ? new Date(p.startDate).getTime() : 0;
  const end = p.endDate ? new Date(p.endDate).getTime() : Number.POSITIVE_INFINITY;
  if (start > now) return 'Mobilising';
  if (end < now)  return 'Completed';
  return 'Ongoing';
}

const STATUS_THEME = {
  Completed:  'bg-success-soft text-success-500',
  Ongoing:    'bg-info-soft text-info-500',
  Mobilising: 'bg-warning-soft text-warning-500',
} as const;

function ProjectTableRow({ p, expanded, onToggle }: { p: any; expanded: boolean; onToggle: () => void }) {
  const status = deriveStatus(p);
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn('border-t border-neutral-100 hover:bg-neutral-25 cursor-pointer', expanded && 'bg-action-orange-soft/30')}
      >
        <td className="p-2">
          <div className="text-[13.5px] font-bold text-ink-950 leading-tight">{p.projectName}</div>
          {p.subtitle && <div className="text-[11.5px] text-neutral-500 mt-0.5">{p.subtitle}</div>}
        </td>
        <td className="p-2 text-[12.5px] text-ink-950">{p.clientName}</td>
        <td className="p-2 text-[12.5px] text-ink-950">{p.type}</td>
        <td className="p-2 text-[12.5px] text-ink-950">{formatDate(p.startDate)}</td>
        <td className="p-2 text-[12.5px] text-ink-950">{p.endDate ? formatDate(p.endDate) : <span className="text-neutral-300">—</span>}</td>
        <td className="p-2">
          <span className={cn('inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-semibold', STATUS_THEME[status])}>
            {status}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-neutral-25 border-t border-neutral-100">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid grid-cols-3 gap-x-8 gap-y-4">
              <PField label="Agreement Value"  value={<span className="text-[14px] font-bold text-ink-950">{formatAED(p.agreementValue)}</span>} />
              <PField label="Project Location" value={p.location} />
              <PField label="Duration"         value={`${projectDurationMonths(p)} months`} />
              <div className="col-span-3">
                <PLabel>Scope of Work</PLabel>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1">
                  {p.scope.map((s: string) => (
                    <li key={s} className="flex items-start gap-2 text-[12.5px] text-ink-950">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-action-orange mt-[7px] flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-3">
                <PLabel>Project Documents</PLabel>
                <div className="mt-1.5 space-y-1.5">
                  <AttachmentRow filename={`${p.projectName.replace(/\s+/g, '_')}_CoC.pdf`} label="CoC for the Project" size="1.2 MB" />
                  <AttachmentRow filename={`${p.projectName.replace(/\s+/g, '_')}_PO.pdf`}  label="Copy of PO / Agreement" size="844 KB" />
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function projectDurationMonths(p: any) {
  if (!p.endDate) return '—';
  return Math.max(1, Math.round((new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (30 * 24 * 3600 * 1000)));
}

function PField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">{label}</div>
      <div className="text-[12.5px] text-ink-950">{value}</div>
    </div>
  );
}

function PLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500">{children}</div>;
}

function AttachmentRow({ filename, label, size }: { filename: string; label: string; size: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-neutral-100 bg-white hover:bg-neutral-25 transition">
      <div className="w-7 h-7 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center flex-shrink-0">
        <PaperclipIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-ink-950 truncate">{label}</div>
        <div className="text-[10.5px] text-neutral-500 truncate"><span className="font-mono">{filename}</span> · {size}</div>
      </div>
      <div className="flex items-center gap-0.5">
        <button onClick={(e) => e.stopPropagation()} className="w-7 h-7 rounded-md hover:bg-neutral-100 grid place-items-center text-neutral-500" title="View"><EyeIcon /></button>
        <button onClick={(e) => e.stopPropagation()} className="w-7 h-7 rounded-md hover:bg-neutral-100 grid place-items-center text-neutral-500" title="Download"><DownloadIcon /></button>
      </div>
    </div>
  );
}

function PreviewTab({ app }: { app: Application }) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const maesVariantTag = getMaesVariantTag(app.serviceId);
  const fileName = certificateFileName(app);
  return (
    <div className="space-y-3">
      {/* PDF viewer toolbar */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-7 h-8 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-ink-950 truncate">{fileName}</div>
            <div className="text-[10.5px] text-neutral-500">Application Document · Uploaded {formatDate(app.submittedOn ?? app.createdAt)}</div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-md border border-neutral-200 px-1 h-8">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950"><ChevLeftIcon /></button>
          <span className="text-[11.5px] font-mono text-ink-950 tabular-nums">{page} of 1</span>
          <button onClick={() => setPage((p) => Math.min(1, p + 1))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950"><ChevRightIcon /></button>
        </div>

        <div className="flex items-center gap-1 bg-white rounded-md border border-neutral-200 px-1 h-8">
          <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950"><ZoomOutIcon /></button>
          <span className="text-[11.5px] font-mono text-ink-950 tabular-nums px-1">{zoom}%</span>
          <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950"><ZoomInIcon /></button>
          <span className="w-px h-4 bg-neutral-200" />
          <button onClick={() => setZoom(100)} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950" title="Fit width"><FitIcon /></button>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/app/${app.id}/preview`}
            title="Open standalone preview"
            className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-ink-950 hover:border-action-orange hover:text-action-orange-deep flex items-center gap-1.5"
          >
            <ExpandIcon /> Open standalone
          </Link>
          <button className="w-8 h-8 rounded-md border border-neutral-200 bg-white grid place-items-center text-neutral-500 hover:text-ink-950" title="Print" onClick={() => window.print()}><PrintIcon /></button>
          <button className="h-8 px-3 rounded-md bg-ink-950 text-white text-[12px] font-semibold flex items-center gap-1.5 hover:opacity-90">
            <DownloadIcon /> Download
          </button>
        </div>
      </div>

      {/* Document page */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 grid place-items-center">
        <div
          className="bg-white shadow-doe-lg rounded-sm origin-top transition-transform"
          style={{
            width: '794px',         // A4 width @ 96dpi
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          {pickCertificateDocument(app, maesVariantTag)}
        </div>
      </div>
    </div>
  );
}

function PermitDocument({ app }: { app: Application }) {
  const c = app.company;
  const cat = app.category || 'D';
  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none grid place-items-center opacity-[0.06]">
        <div className="font-display font-bold text-ink-950" style={{ fontSize: '88px', transform: 'rotate(-18deg)' }}>
          DEPARTMENT OF ENERGY
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-6 relative">
        <div className="text-[11px] leading-snug">
          <div className="font-bold uppercase tracking-wider">United Arab Emirates</div>
          <div className="font-bold uppercase tracking-wider">Abu Dhabi Emirate</div>
          <div className="text-neutral-700 mt-0.5">Department Of Energy</div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <img src="/doe-logo.png" alt="DoE" className="h-14 w-auto" />
        </div>
        <div className="text-[11px] leading-snug text-right" dir="rtl">
          <div className="font-bold">دولة الإمارات العربية المتحدة</div>
          <div className="font-bold">إمارة أبوظبي</div>
          <div className="text-neutral-700 mt-0.5">دائرة الطاقة</div>
        </div>
      </div>

      <div className="h-px bg-ink-950/40 mt-3" />

      {/* Permit preamble */}
      <p dir="rtl" className="text-[11px] text-right mt-4 leading-relaxed">
        تم إصدار التصريح استنادا إلى القانون رقم (5) لسنة 2023 وبموجب أحكام القانون الاتحادي رقم (14) لسنة (2017) وقرار رئيس دائرة الطاقة رقم (14) لسنة 2025
        بشأن اللائحة التنظيمية لأعمال الغاز في المباني
      </p>

      <h2 dir="rtl" className="text-right font-bold text-[13.5px] mt-3">تصريح شركة أنظمة غاز في المباني والمنشآت</h2>

      {/* Two-column bilingual field grid */}
      <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
        <PermitField labelEn="" labelAr="الاسم التجاري للمنشأة" value={c.name} />
        <PermitField labelEn="" labelAr="رقم السجل" value={c.tradePermitNumber} />

        <PermitField labelEn="" labelAr="اسم صاحب الترخيص" value={c.ownerName} />
        <PermitField labelEn="" labelAr="رقم الرخصة" value={`DOE\\PPS\\PREQ-GC\\${new Date().getFullYear()}-${(app.applicationNumber.replace(/[^0-9]/g, '').slice(-4) || '0000')}`} />

        <PermitField labelEn="" labelAr="رقم الهاتف" value={c.phone} />
        <PermitField labelEn="" labelAr="الجنسية" value={c.nationality} />
      </div>

      {/* Category checkboxes */}
      <div className="mt-5">
        <div dir="rtl" className="text-right text-[11px] font-semibold">نوع النشاط</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-2 text-[10.5px]">
          <CategoryRow code="C" labelAr="تركيب وصيانة وتشغيل أنظمة الغاز المركزي" checked={cat === 'C'} />
          <CategoryRow code="A" labelAr="تركيب وصيانة وتشغيل أنظمة الغاز المركزي" checked={cat === 'A'} />
          <CategoryRow code="D" labelAr="تركيب وصيانة أنظمة الغاز - نظام الأسطوانات فقط" checked={cat === 'D'} />
          <CategoryRow code="B" labelAr="أعمال التعبئة للغاز البترولي المسال" checked={cat === 'B'} />
        </div>
      </div>

      {/* Address & Contact */}
      <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
        <PermitField labelEn="" labelAr="رقم الفاكس" value="-" />
        <PermitField labelEn="" labelAr="ص.ب" value={c.poBox} />

        <PermitField labelEn="" labelAr="عنوان الشركة" value={c.address} />
        <PermitField labelEn="" labelAr="الموقع و البريد الإلكتروني" value={`${c.website?.replace(/^https?:\/\//, '') || '-'} | ${c.email}`} />

        <PermitField labelEn="" labelAr="تاريخ الإصدار" value={formatDate(app.approvedOn || app.submittedOn, { year: 'numeric', month: '2-digit', day: '2-digit' })} />
        <PermitField labelEn="" labelAr="تاريخ الانتهاء" value={formatDate(app.expiryDate || addYear(app.approvedOn), { year: 'numeric', month: '2-digit', day: '2-digit' })} />

        <PermitField labelEn="" labelAr="عدد المهندسين" value="2" />
        <PermitField labelEn="" labelAr="تاريخ تأسيس المنشأة" value={formatDate(c.establishmentDate)} />

        <PermitField labelEn="" labelAr="عدد الفنيين" value="6" />
        <PermitField labelEn="" labelAr="تم تسديد الرسوم بإيصال رقم" value="-" />

        <PermitField labelEn="" labelAr="رقم التصريح" value={`DOE\\PPS\\PREQ-GC\\${new Date().getFullYear()}-${(app.applicationNumber.replace(/[^0-9]/g, '').slice(-4) || '0000')}`} />
        <PermitField labelEn="" labelAr="الاسم التجاري للمنشأة" value={c.name} />

        <PermitField labelEn="" labelAr="سنة التصريح" value={String(new Date().getFullYear())} />
        <div />
      </div>

      {/* Footer notes */}
      <div className="mt-6 text-[10px]" dir="rtl">
        <div className="font-semibold">ملاحظة:</div>
        <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
          <li>تُعد المنشأة مصرح لها من قبل دائرة الطاقة - أبوظبي لمزاولة نشاطها ضمن نطاق أعمال تصنيفها فقط داخل إمارة أبوظبي.</li>
          <li>إبلاغ دائرة الطاقة في حالة تغيير أو تعديل في البيانات المتعلقة في التصريح الصادر من قبل دائرة الطاقة.</li>
        </ol>
      </div>

      {/* QR code corner */}
      <div className="absolute bottom-8 right-8">
        <div className="w-16 h-16 grid grid-cols-8 grid-rows-8 gap-px bg-white p-0.5 border border-ink-950">
          {Array.from({ length: 64 }, (_, i) => {
            const hash = (i * 9301 + 49297) % 233280;
            const on = (hash / 233280) > 0.45;
            return <div key={i} className={on ? 'bg-ink-950' : 'bg-white'} />;
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAES Registration / Cancellation / Revocation Certificate (A4 preview)
// ───────────────────────────────────────────────────────────────────────────
// Redesigned to match the existing PermitDocument DoE-certificate style used
// elsewhere in this codebase — same three-column letterhead with a centred
// DoE crest, same horizontal divider, same Arabic-first legal preamble, same
// bilingual section title, and the same two-column PermitField grid for the
// data block. The MAES-specific addition is the per-material expiry list and
// the auto-derived Certificate Expiry Date (= MAX(material expiry dates)) per
// SDD §1.3.4.3. Four variants:
//   • Registration  — Issuance / Renewal / Modification (§1.3.4 / §2.3.7 / §3.3.7)
//   • Cancellation  — partial regen OR full cancellation cert (§4.3.7)
//   • Revocation    — partial regen OR full revocation cert (§5.3.6)
// ============================================================================
function MaesCertificateDocument({ app, variant }: { app: Application; variant: 'Registration' | 'Renewal' | 'Modification' | 'Cancellation' | 'Revocation' }) {
  const c = app.company;
  const materials = app.materials ?? [];
  const today = new Date().toISOString().slice(0, 10);

  // Per SDD: full cancellation/revocation = every row tagged; partial = subset.
  const activeRows    = materials.filter((m) => m.status !== 'cancelled' && m.status !== 'revoked');
  const cancelledRows = materials.filter((m) => m.status === 'cancelled');
  const revokedRows   = materials.filter((m) => m.status === 'revoked');
  const isFullCancel  = variant === 'Cancellation' && cancelledRows.length > 0 && activeRows.length === 0;
  const isFullRevoke  = variant === 'Revocation'   && revokedRows.length > 0   && activeRows.length === 0;

  // Certificate-level Expiry Date = MAX of active material expiry dates.
  const certExpiry = (activeRows.length > 0 ? activeRows : materials)
    .map((m) => m.expiryDate).sort().slice(-1)[0] ?? today;

  // Variant titles (EN + AR) match PermitDocument's pattern of bilingual headers.
  const variantMeta = (() => {
    if (variant === 'Cancellation') return {
      titleEn: isFullCancel ? 'Certificate of Cancellation' : 'Material & Equipment Approval Certificate — Regenerated',
      titleAr: isFullCancel ? 'شهادة إلغاء اعتماد المواد والمعدات' : 'شهادة اعتماد المواد والمعدات — معاد إصدارها',
      sectionAr: isFullCancel ? 'إلغاء اعتماد المواد والمعدات لأنظمة الغاز' : 'إلغاء جزئي - شهادة اعتماد المواد والمعدات لأنظمة الغاز',
      preambleAr: 'صدرت هذه الشهادة استنادًا إلى الإطار التنظيمي لنظام اعتماد المواد والمعدات (MAES) لأنظمة الغاز في إمارة أبوظبي بموجب أحكام قرار رئيس دائرة الطاقة رقم (14) لسنة 2025، وبناءً على المراجعة الداخلية لدى دائرة الطاقة.',
      tag: isFullCancel ? 'CANCELLED' : 'PARTIALLY CANCELLED',
    };
    if (variant === 'Revocation') return {
      titleEn: isFullRevoke ? 'Certificate of Revocation' : 'Material & Equipment Approval Certificate — Regenerated',
      titleAr: isFullRevoke ? 'شهادة سحب اعتماد المواد والمعدات' : 'شهادة اعتماد المواد والمعدات — معاد إصدارها',
      sectionAr: isFullRevoke ? 'سحب اعتماد المواد والمعدات لأنظمة الغاز' : 'سحب جزئي - شهادة اعتماد المواد والمعدات لأنظمة الغاز',
      preambleAr: 'صدر هذا السحب التنظيمي استنادًا إلى صلاحيات دائرة الطاقة - أبوظبي بموجب القانون رقم (5) لسنة 2023 وأحكام قرار رئيس دائرة الطاقة رقم (14) لسنة 2025 بشأن نظام اعتماد المواد والمعدات (MAES).',
      tag: isFullRevoke ? 'REVOKED' : 'PARTIALLY REVOKED',
    };
    return {
      titleEn: 'Certificate of Material & Equipment Approval',
      titleAr: 'شهادة اعتماد المواد والمعدات لأنظمة الغاز',
      sectionAr: 'تسجيل المواد والمعدات لأنظمة الغاز في إمارة أبوظبي',
      preambleAr: 'تم إصدار هذه الشهادة استنادًا إلى القانون رقم (5) لسنة 2023 وبموجب أحكام القانون الاتحادي رقم (14) لسنة 2017 وقرار رئيس دائرة الطاقة رقم (14) لسنة 2025 بشأن نظام اعتماد المواد والمعدات (MAES) لأنظمة الغاز في إمارة أبوظبي.',
      tag: variant === 'Renewal' ? 'RENEWED' : variant === 'Modification' ? 'MODIFIED' : 'ISSUED',
    };
  })();

  // Field-level lookups with company.* fall-backs.
  const fv = (id: string) => app.fieldValues?.[id] ?? '';
  const maesRef = fv('maesNumber') || app.applicationNumber.replace(/^MAES-[A-Z]{3}-/, 'MAES-CERT-');
  const applicantTypeKey = fv('applicantType') || 'agent';
  const applicantTypeEn = applicantTypeKey.replace(/^\w/, (ch) => ch.toUpperCase());
  const applicantTypeAr = applicantTypeKey === 'manufacturer' ? 'الشركة المصنعة' : applicantTypeKey === 'distributor' ? 'الموزع' : 'الوكيل';
  const issueDate = formatDate(app.approvedOn ?? app.submittedOn ?? app.createdAt, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const expiryDate = formatDate(certExpiry, { year: 'numeric', month: '2-digit', day: '2-digit' });

  const isCancelledOrRevoked = isFullCancel || isFullRevoke;
  const showStrike = (m: import('../types').MaesMaterial) => m.status === 'cancelled' || m.status === 'revoked';

  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      {/* Watermark — sized down so it stays in the background. Status word
          replaces the brand line for full cancel/revoke certificates. */}
      <div className="absolute inset-0 pointer-events-none grid place-items-center opacity-[0.05]">
        <div
          className="font-display font-bold text-ink-950 whitespace-nowrap tracking-[0.18em]"
          style={{ fontSize: '42px', transform: 'rotate(-18deg)' }}
        >
          {isCancelledOrRevoked ? variantMeta.tag : 'DEPARTMENT OF ENERGY'}
        </div>
      </div>

      {/* ──────────── HEADER ──────────── */}
      {/* Same three-column layout as PermitDocument: EN identity | centred crest | AR identity */}
      <div className="flex items-start justify-between gap-6 relative">
        <div className="text-[11px] leading-snug">
          <div className="font-bold uppercase tracking-wider">United Arab Emirates</div>
          <div className="font-bold uppercase tracking-wider">Abu Dhabi Emirate</div>
          <div className="text-neutral-700 mt-0.5">Department Of Energy</div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <img src="/doe-logo.png" alt="DoE" className="h-14 w-auto" />
        </div>
        <div className="text-[11px] leading-snug text-right" dir="rtl">
          <div className="font-bold">دولة الإمارات العربية المتحدة</div>
          <div className="font-bold">إمارة أبوظبي</div>
          <div className="text-neutral-700 mt-0.5">دائرة الطاقة</div>
        </div>
      </div>

      <div className="h-px bg-ink-950/40 mt-3" />

      {/* Arabic legal preamble */}
      <p dir="rtl" className="text-[11px] text-right mt-4 leading-relaxed">
        {variantMeta.preambleAr}
      </p>

      {/* Bilingual section title — Arabic on the right (matches PermitDocument), English mirror below */}
      <div className="flex items-baseline justify-between gap-4 mt-3">
        <div className="font-display font-bold text-[13px]">{variantMeta.titleEn}</div>
        <h2 dir="rtl" className="text-right font-bold text-[13.5px]">{variantMeta.sectionAr}</h2>
      </div>

      {/* Status tag — bilingual */}
      <div className="mt-2 flex items-center gap-2 text-[10px]">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-sm border font-bold uppercase tracking-[0.18em]',
          isCancelledOrRevoked || variant === 'Cancellation' || variant === 'Revocation' ? 'border-doe-red text-doe-red bg-doe-red/5' :
          variant === 'Renewal' ? 'border-success-500 text-success-500 bg-success-soft' :
          variant === 'Modification' ? 'border-info-500 text-info-500 bg-info-soft' :
          'border-action-orange text-action-orange-deep bg-action-orange-soft',
        )}>
          {variantMeta.tag}
        </span>
        <span className="text-neutral-500">
          MAES Reference: <span className="font-mono text-ink-950">{maesRef}</span>
        </span>
      </div>

      {/* ──────────── BILINGUAL FIELD GRID ──────────── */}
      {/* Two-column PermitField grid identical in shape to PermitDocument. */}
      <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
        <PermitField labelAr="الاسم التجاري للمنشأة"      value={c.name} />
        <PermitField labelAr="رقم السجل التجاري"           value={fv('tradeLicence') || c.tradePermitNumber} />

        <PermitField labelAr="نوع مقدم الطلب"              value={`${applicantTypeEn} / ${applicantTypeAr}`} />
        <PermitField labelAr="جهة الترخيص"                  value={fv('licensedBy') || 'دائرة التنمية الاقتصادية - أبوظبي'} />

        <PermitField labelAr="اسم الممثل المخول"            value={fv('representativeName') || c.authorizedRepresentative} />
        <PermitField labelAr="الجنسية"                       value={fv('nationality') || c.nationality} />

        <PermitField labelAr="رقم الهاتف"                    value={fv('mobile') || c.phone} />
        <PermitField labelAr="البريد الإلكتروني"             value={fv('email') || c.email} />

        <PermitField labelAr="عنوان الشركة"                  value={fv('address') || c.address} />
        <PermitField labelAr="ص.ب"                            value={fv('poBox') || c.poBox || '-'} />

        <PermitField labelAr="نطاق النشاط"                   value={fv('activityArea') || 'إمارة أبوظبي'} />
        <PermitField labelAr="تاريخ تأسيس المنشأة"           value={formatDate(fv('establishmentDate') || c.establishmentDate)} />

        <PermitField labelAr="تاريخ إصدار الشهادة"           value={issueDate} />
        <PermitField labelAr="تاريخ انتهاء الشهادة"          value={expiryDate} />

        <PermitField labelAr="عدد المواد / المعدات المسجلة"  value={String(materials.length)} />
        <PermitField labelAr="رقم الطلب"                     value={app.applicationNumber} />
      </div>

      {/* Note on the derivation of the certificate expiry */}
      <div className="mt-2 text-[9.5px] text-neutral-500 italic" dir="rtl">
        تاريخ انتهاء الشهادة محسوب تلقائيًا كأقصى قيمة لتواريخ انتهاء صلاحية المواد المسجلة (MAX of per-material expiry dates) وفقًا لـ MAES SDD §1.3.4.3.
      </div>

      {/* ──────────── APPROVED MATERIALS — name + expiry only ──────────── */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between mb-2">
          <div dir="rtl" className="text-right text-[11px] font-semibold flex-1">قائمة المواد والمعدات المعتمدة</div>
          <div className="text-[10.5px] text-neutral-500 ml-3">
            Approved Materials &amp; Equipment List
          </div>
        </div>
        <div className="border-y-2 border-ink-950">
          {/* Header strip */}
          <div className="grid grid-cols-[24px_1fr_120px] items-center text-[9.5px] font-bold uppercase tracking-wider text-neutral-700 bg-neutral-50 border-b border-neutral-300">
            <div className="py-1.5 px-2">#</div>
            <div className="py-1.5 px-2">Material Name <span className="font-normal text-neutral-500" dir="rtl">/ اسم المادة</span></div>
            <div className="py-1.5 px-2 text-right">Expiry <span className="font-normal text-neutral-500" dir="rtl">/ الانتهاء</span></div>
          </div>
          {/* Two-column body so 14 materials still fit on one page */}
          <div className="grid grid-cols-2 divide-x divide-neutral-200">
            {[0, 1].map((col) => {
              const half = Math.ceil(materials.length / 2);
              const slice = col === 0 ? materials.slice(0, half) : materials.slice(half);
              const startIdx = col === 0 ? 0 : half;
              return (
                <div key={col} className="divide-y divide-neutral-100">
                  {slice.map((m, i) => {
                    const isMatExpired = m.status === 'active' && m.expiryDate < today;
                    const isStruck = showStrike(m);
                    const tone =
                      isStruck ? 'text-doe-red' :
                      m.status === 'pending-renewal' ? 'text-action-orange-deep' :
                      isMatExpired ? 'text-action-orange-deep' :
                      'text-ink-950';
                    const badge =
                      m.status === 'cancelled' ? 'Cancelled' :
                      m.status === 'revoked' ? 'Revoked' :
                      m.status === 'pending-renewal' ? 'Pending Renewal' :
                      isMatExpired ? 'Expired' :
                      null;
                    return (
                      <div key={m.id} className={cn('grid grid-cols-[24px_1fr_88px] items-baseline py-1 px-2 text-[10.5px]', tone)}>
                        <div className="font-mono text-neutral-400">{String(startIdx + i + 1).padStart(2, '0')}</div>
                        <div className="min-w-0 truncate">
                          <span className={cn('font-medium', isStruck && 'line-through')}>{m.commercialName}</span>
                          {badge && (
                            <span className="ml-1.5 text-[8.5px] uppercase tracking-widest font-semibold">· {badge}</span>
                          )}
                        </div>
                        <div className={cn('font-mono tabular-nums text-right', isStruck && 'line-through')}>
                          {formatDate(m.expiryDate, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Derived certificate expiry footer */}
          <div className="grid grid-cols-2 items-baseline py-1.5 px-2 border-t-2 border-ink-950 bg-neutral-50 text-[10.5px] font-semibold">
            <div className="uppercase tracking-wider text-neutral-700">Derived Certificate Expiry · MAX(material expiry)</div>
            <div className="text-right font-mono tabular-nums">{expiryDate}</div>
          </div>
        </div>
      </div>

      {/* ──────────── ARABIC FOOTER NOTES — matches PermitDocument ──────────── */}
      <div className="mt-6 text-[10px]" dir="rtl">
        <div className="font-semibold">ملاحظة:</div>
        <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
          {variant === 'Cancellation' ? (
            <>
              <li>{isFullCancel
                ? 'يعتبر اعتماد المواد والمعدات الصادر تحت هذا المرجع ملغى بالكامل من تاريخ الاعتماد المبين أعلاه.'
                : 'تم إلغاء المواد والمعدات الموسومة بـ "Cancelled" فقط، وتبقى باقي المواد سارية ضمن نفس الرقم المرجعي.'}</li>
              <li>يحتفظ هذا المرجع برقمه الأصلي لأغراض التدقيق والربط بالخدمات اللاحقة (NOC وCOC).</li>
              <li>لا يجوز تجديد أو تعديل أي مادة ملغاة تحت هذا المرجع؛ يلزم تقديم طلب اعتماد جديد لإعادة تسجيلها.</li>
            </>
          ) : variant === 'Revocation' ? (
            <>
              <li>{isFullRevoke
                ? 'تم سحب اعتماد المواد والمعدات الصادر تحت هذا المرجع بالكامل بقرار من دائرة الطاقة - أبوظبي.'
                : 'تم سحب المواد والمعدات الموسومة بـ "Revoked" فقط، وتبقى باقي المواد سارية ضمن نفس الرقم المرجعي.'}</li>
              <li>هذا السحب صادر عن الجهة التنظيمية ولا يجوز الطعن فيه إلا وفق الإجراءات المعتمدة لدى دائرة الطاقة.</li>
              <li>لا يجوز إعادة تسجيل المواد المسحوبة تحت نفس المرجع؛ يلزم تقديم طلب اعتماد جديد.</li>
            </>
          ) : (
            <>
              <li>{variant === 'Renewal'
                ? 'تم تجديد اعتماد المواد والمعدات المسجلة تحت هذا المرجع، مع إعادة احتساب تاريخ انتهاء الشهادة آليًا.'
                : variant === 'Modification'
                ? 'تم تعديل بيانات المواد والمعدات المسجلة تحت هذا المرجع، مع الاحتفاظ بالرقم المرجعي الأصلي.'
                : 'تعتمد المواد والمعدات المذكورة أعلاه للاستخدام في أنظمة الغاز ضمن إمارة أبوظبي وفقًا لمواصفات Unified Gas Code.'}</li>
              <li>يتعين على المنشأة إبلاغ دائرة الطاقة في حال تغيير أو تعديل أي من البيانات المتعلقة بهذه الشهادة.</li>
              <li>يحق لدائرة الطاقة - أبوظبي مراجعة هذه الشهادة في أي وقت بناءً على نتائج التفتيش الميداني أو المراجعات الدورية.</li>
            </>
          )}
        </ol>
      </div>

      {/* ──────────── SIGNATURE + QR ──────────── */}
      <div className="mt-7 grid grid-cols-[1fr_auto_1fr] gap-6 items-end">
        <div className="text-[10px]">
          <div className="text-neutral-500 mb-1" dir="rtl">جهة الإصدار</div>
          <div className="font-semibold">Petroleum Products &amp; Safety Services</div>
          <div className="text-neutral-700">Department of Energy — Abu Dhabi</div>
        </div>
        <div className="text-center">
          <MockQR data={`${maesRef}|${app.applicationNumber}`} size={88} />
          <div className="text-[8.5px] font-mono text-neutral-500 mt-1">{app.applicationNumber}</div>
        </div>
        <div className="text-right text-[10px]" dir="rtl">
          <div className="text-neutral-500 mb-1">الموقع المعتمد</div>
          <div className="font-semibold">م. حصة المزروعي</div>
          <div className="text-neutral-700">رئيس قسم تخطيط وتنظيم الغاز</div>
          <div className="text-neutral-500 mt-2">ختم الدائرة على الملف الرسمي</div>
        </div>
      </div>

      <div className="mt-4 pt-2 border-t border-neutral-200 text-[9px] text-neutral-500 text-center">
        This is a digitally generated certificate. Validity can be confirmed via the DoE Unified Service Portal using the QR code or the MAES Reference Number.
        <span className="block mt-0.5" dir="rtl">هذه شهادة صادرة رقميًا. يمكن التحقق من صلاحيتها عبر بوابة الخدمات الموحدة لدائرة الطاقة باستخدام رمز الاستجابة السريعة أو الرقم المرجعي لـ MAES.</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MockQR — visually convincing QR-code mock. Real QR encoders are heavy, so
// this builds a 25×25 matrix that pattern-matches the QR visual grammar:
//   • Three position-detection patterns (finder squares) at TL / TR / BL
//   • Timing lines connecting them (alternating black/white modules on row/col 6)
//   • Quiet-zone padding around the data area
//   • Pseudo-random module fill seeded by the input data so each cert has a
//     stable, unique-looking pattern.
// ────────────────────────────────────────────────────────────────────────────
function MockQR({ data, size = 96 }: { data: string; size?: number }) {
  const N = 25; // grid resolution
  const matrix: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false));

  // Position-detection pattern: 7×7 module with outer ring + inner 3×3 block
  function addFinder(r0: number, c0: number) {
    for (let dr = 0; dr < 7; dr++) {
      for (let dc = 0; dc < 7; dc++) {
        const outerRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const innerBlock = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        matrix[r0 + dr][c0 + dc] = outerRing || innerBlock;
      }
    }
  }
  addFinder(0, 0);
  addFinder(0, N - 7);
  addFinder(N - 7, 0);

  // Timing patterns — alternating modules between finders on row & col 6
  for (let i = 8; i < N - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Single "alignment pattern" 5×5 near the bottom-right (real QRs >v1 have these)
  const ar0 = N - 9;
  const ac0 = N - 9;
  for (let dr = 0; dr < 5; dr++) {
    for (let dc = 0; dc < 5; dc++) {
      const outer = dr === 0 || dr === 4 || dc === 0 || dc === 4;
      const center = dr === 2 && dc === 2;
      matrix[ar0 + dr][ac0 + dc] = outer || center;
    }
  }

  // Fill remaining data area with a deterministic pseudo-random pattern.
  let h = 2166136261;
  for (let i = 0; i < data.length; i++) h = ((h ^ data.charCodeAt(i)) * 16777619) >>> 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= N - 8;
      const inBL = r >= N - 8 && c < 8;
      const inAlign = r >= ar0 && r < ar0 + 5 && c >= ac0 && c < ac0 + 5;
      const inTiming = (r === 6 && c >= 8 && c < N - 8) || (c === 6 && r >= 8 && r < N - 8);
      if (inTL || inTR || inBL || inAlign || inTiming) continue;
      h = (h * 1103515245 + 12345) >>> 0;
      matrix[r][c] = (h & 0xff) > 128;
    }
  }

  return (
    <div className="inline-block bg-white p-1 border border-ink-950">
      <div
        style={{
          width: size,
          height: size,
          display: 'grid',
          gridTemplateColumns: `repeat(${N}, 1fr)`,
          gridTemplateRows: `repeat(${N}, 1fr)`,
        }}
      >
        {matrix.flatMap((row, r) =>
          row.map((cell, c) => (
            <div key={`${r}-${c}`} className={cell ? 'bg-ink-950' : 'bg-white'} />
          )),
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Module-aware certificate selector — picks the correct A4 document layout per
// service module so each license preview matches its underlying content.
//   • gas → PermitDocument (Gas System Company Registration permit)
//   • amc → AmcCertificateDocument
//   • noc → NocCertificateDocument
//   • coc → CocCertificateDocument
//   • hoe → HoeCertificateDocument
//   • maes → MaesCertificateDocument (existing — handled outside this switch)
//
// Exported so the standalone preview page (/app/:appId/preview) can render the
// exact same certificate document inside its own full-screen chrome.
// ============================================================================
export type MaesVariantTag = 'Registration' | 'Renewal' | 'Modification' | 'Cancellation' | 'Revocation';

export function getMaesVariantTag(serviceId: string): MaesVariantTag {
  return serviceId === 'maes.cancel' ? 'Cancellation' :
         serviceId === 'maes.revoke' ? 'Revocation' :
         serviceId === 'maes.modify' ? 'Modification' :
         serviceId === 'maes.renew'  ? 'Renewal' :
         'Registration';
}

export function certificateFileName(app: Application): string {
  if (app.module === 'maes') {
    return `${abbrev(app.company.name)}-MAES-${getMaesVariantTag(app.serviceId)}-Certificate.pdf`;
  }
  const tag =
    app.module === 'amc' ? 'AMC-Certificate' :
    app.module === 'noc' ? 'NOC-Certificate' :
    app.module === 'coc' ? 'COC-Certificate' :
    app.module === 'hoe' ? 'HOE-Engineer-Registration' :
    'Registration-Packet';
  return `${abbrev(app.company.name)}-${tag}.pdf`;
}

export function pickCertificateDocument(
  app: Application,
  maesVariantTag?: MaesVariantTag,
): React.ReactNode {
  if (app.module === 'maes') {
    const tag = maesVariantTag ?? getMaesVariantTag(app.serviceId);
    return <MaesCertificateDocument app={app} variant={tag} />;
  }
  if (app.module === 'amc')  return <AmcCertificateDocument app={app} />;
  if (app.module === 'noc')  return <NocCertificateDocument app={app} />;
  if (app.module === 'coc')  return <CocCertificateDocument app={app} />;
  if (app.module === 'hoe')  return <HoeCertificateDocument app={app} />;
  return <PermitDocument app={app} />;
}

// ============================================================================
// Shared header strip used by every non-MAES certificate document.
// Renders the bilingual letterhead (UAE · Abu Dhabi · Department of Energy),
// the DoE crest, and a thin horizontal divider.
// ============================================================================
function CertificateLetterhead() {
  return (
    <>
      <div className="flex items-start justify-between gap-6 relative">
        <div className="text-[11px] leading-snug">
          <div className="font-bold uppercase tracking-wider">United Arab Emirates</div>
          <div className="font-bold uppercase tracking-wider">Abu Dhabi Emirate</div>
          <div className="text-neutral-700 mt-0.5">Department Of Energy</div>
        </div>
        <div className="flex-1 flex flex-col items-center">
          <img src="/doe-logo.png" alt="DoE" className="h-14 w-auto" />
        </div>
        <div className="text-[11px] leading-snug text-right" dir="rtl">
          <div className="font-bold">دولة الإمارات العربية المتحدة</div>
          <div className="font-bold">إمارة أبوظبي</div>
          <div className="text-neutral-700 mt-0.5">دائرة الطاقة</div>
        </div>
      </div>
      <div className="h-px bg-ink-950/40 mt-3" />
    </>
  );
}

// ============================================================================
// Shared watermark + QR — keeps every cert visually consistent.
// ============================================================================
function CertificateWatermark({ text = 'DEPARTMENT OF ENERGY' }: { text?: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center opacity-[0.06]">
      <div className="font-display font-bold text-ink-950" style={{ fontSize: '88px', transform: 'rotate(-18deg)' }}>
        {text}
      </div>
    </div>
  );
}

function CertificateQR() {
  return (
    <div className="absolute bottom-8 right-8">
      <div className="w-16 h-16 grid grid-cols-8 grid-rows-8 gap-px bg-white p-0.5 border border-ink-950">
        {Array.from({ length: 64 }, (_, i) => {
          const hash = (i * 9301 + 49297) % 233280;
          const on = (hash / 233280) > 0.45;
          return <div key={i} className={on ? 'bg-ink-950' : 'bg-white'} />;
        })}
      </div>
    </div>
  );
}

function certReference(app: Application, prefix: string): string {
  const year = new Date().getFullYear();
  const seq = (app.applicationNumber.replace(/[^0-9]/g, '').slice(-4) || '0000');
  return `DOE\\PPS\\${prefix}\\${year}-${seq}`;
}

// ============================================================================
// AMC — Annual Maintenance Contract Certificate (AMC Enhancements SDD)
// ----------------------------------------------------------------------------
// Issued to a registered Gas System Company that holds an Annual Maintenance
// Contract for a specific building / premises. Tracks the contracted scope,
// validity, and the principals (service provider + building owner).
// ============================================================================
function AmcCertificateDocument({ app }: { app: Application }) {
  const c = app.company;
  const ref = certReference(app, 'AMC');
  const premises = app.fieldValues?.premisesName || app.fieldValues?.buildingName || c.address;
  const ownerName = app.fieldValues?.ownerName || c.ownerName;

  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      <CertificateWatermark text="ANNUAL MAINTENANCE CONTRACT" />
      <div className="relative">
        <CertificateLetterhead />

        {/* Legal preamble */}
        <p dir="rtl" className="text-[11px] text-right mt-4 leading-relaxed">
          صدرت هذه الشهادة استنادًا إلى القانون رقم (5) لسنة 2023 بشأن قطاع الطاقة في إمارة أبوظبي، وقرار رئيس دائرة الطاقة بشأن عقود الصيانة السنوية لأنظمة الغاز في المباني والمنشآت.
        </p>
        <p className="text-[10.5px] mt-2 leading-relaxed text-neutral-700">
          Issued under Law No. (5) of 2023 regulating the Energy Sector in Abu Dhabi, and the DoE resolution governing Annual Maintenance Contracts (AMC) for gas systems in buildings and premises.
        </p>

        {/* Bilingual title */}
        <h2 dir="rtl" className="text-right font-bold text-[13.5px] mt-4">شهادة عقد الصيانة السنوية لأنظمة الغاز</h2>
        <h3 className="font-display font-bold text-[14px] mt-0.5">Annual Maintenance Contract — Certificate</h3>

        {/* Identity */}
        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="رقم الشهادة" value={ref} />
          <PermitField labelAr="رقم الطلب" value={app.applicationNumber} />

          <PermitField labelAr="اسم مزود الخدمة" value={c.name} />
          <PermitField labelAr="رقم السجل التجاري" value={c.tradePermitNumber} />

          <PermitField labelAr="الفئة" value={`Category ${app.category ?? 'D'} · Gas Maintenance Contractor`} />
          <PermitField labelAr="جنسية صاحب الترخيص" value={c.nationality} />

          <PermitField labelAr="رقم الهاتف" value={c.phone} />
          <PermitField labelAr="البريد الإلكتروني" value={c.email} />
        </div>

        {/* Contract scope */}
        <div className="mt-5">
          <div dir="rtl" className="text-right text-[11px] font-semibold">نطاق العقد</div>
          <div className="grid grid-cols-2 gap-x-6 mt-2 text-[11px]">
            <PermitField labelAr="اسم المبنى" value={premises} />
            <PermitField labelAr="اسم مالك المبنى" value={ownerName} />

            <PermitField labelAr="عنوان المبنى" value={c.address} />
            <PermitField labelAr="ص.ب" value={c.poBox} />

            <PermitField labelAr="نوع نظام الغاز" value={app.fieldValues?.gasSystemType || 'Centralised LPG / SNG'} />
            <PermitField labelAr="عدد نقاط الخدمة" value={app.fieldValues?.servicePoints || '—'} />

            <PermitField labelAr="تواتر الصيانة" value={app.fieldValues?.maintenanceFrequency || 'Quarterly + Annual full check'} />
            <PermitField labelAr="المهندس المسؤول" value={app.technicalStaff[0]?.name || '—'} />
          </div>
        </div>

        {/* Validity */}
        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="تاريخ الإصدار" value={formatDate(app.approvedOn || app.submittedOn, { year: 'numeric', month: '2-digit', day: '2-digit' })} />
          <PermitField labelAr="تاريخ الانتهاء" value={formatDate(app.expiryDate || addYear(app.approvedOn), { year: 'numeric', month: '2-digit', day: '2-digit' })} />

          <PermitField labelAr="رقم الإيصال" value={app.feeReceipt?.receiptNumber || '—'} />
          <PermitField labelAr="قيمة الرسوم" value={app.feeReceipt ? `AED ${app.feeReceipt.amount.toLocaleString()}` : '—'} />
        </div>

        {/* Footer notes */}
        <div className="mt-6 text-[10px]" dir="rtl">
          <div className="font-semibold">ملاحظات:</div>
          <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
            <li>تُعد هذه الشهادة سارية المفعول طوال مدة العقد المسجل لدى دائرة الطاقة.</li>
            <li>يجب على مزود الخدمة الاحتفاظ بسجلات الصيانة الدورية لمدة لا تقل عن خمس (5) سنوات.</li>
            <li>إبلاغ دائرة الطاقة عند أي تعديل في نطاق العقد أو إنهائه قبل الموعد المقرر.</li>
          </ol>
        </div>

        <CertificateQR />
      </div>
    </div>
  );
}

// ============================================================================
// NOC — No Objection Certificate (NOC Enhancement SDD)
// ----------------------------------------------------------------------------
// Issued to the building owner / facility manager confirming DoE's no-objection
// to the operation of a gas system on their premises. Always bound to a
// specific premises + storage capacity.
// ============================================================================
function NocCertificateDocument({ app }: { app: Application }) {
  const c = app.company;
  const ref = certReference(app, 'NOC');
  const premises = app.fieldValues?.premisesName || app.fieldValues?.buildingName || c.name;
  const buildingUse = app.fieldValues?.buildingUseType || app.fieldValues?.buildingType || 'Mixed Use';
  const storageCapacity = app.fieldValues?.gasStorageCapacity || '—';
  const cylinderCount = app.fieldValues?.cylinderCount || '—';

  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      <CertificateWatermark text="NO OBJECTION CERTIFICATE" />
      <div className="relative">
        <CertificateLetterhead />

        <p dir="rtl" className="text-[11px] text-right mt-4 leading-relaxed">
          صدرت شهادة عدم الممانعة استنادًا إلى القانون رقم (5) لسنة 2023، وقرار رئيس دائرة الطاقة بشأن تشغيل أنظمة الغاز في المباني والمنشآت داخل إمارة أبوظبي.
        </p>
        <p className="text-[10.5px] mt-2 leading-relaxed text-neutral-700">
          Issued under Law No. (5) of 2023 and the DoE resolution governing the operation of gas systems in buildings and premises within the Emirate of Abu Dhabi.
        </p>

        <h2 dir="rtl" className="text-right font-bold text-[13.5px] mt-4">شهادة عدم ممانعة لتشغيل أنظمة الغاز</h2>
        <h3 className="font-display font-bold text-[14px] mt-0.5">No Objection Certificate — Gas System Operation</h3>

        {/* Premises identity */}
        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="رقم الشهادة" value={ref} />
          <PermitField labelAr="رقم الطلب" value={app.applicationNumber} />

          <PermitField labelAr="اسم المنشأة" value={premises} />
          <PermitField labelAr="اسم المالك" value={c.ownerName} />

          <PermitField labelAr="نوع الاستخدام" value={buildingUse} />
          <PermitField labelAr="رقم السجل التجاري" value={c.tradePermitNumber} />

          <PermitField labelAr="عنوان المنشأة" value={c.address} />
          <PermitField labelAr="ص.ب" value={c.poBox} />

          <PermitField labelAr="رقم الهاتف" value={c.phone} />
          <PermitField labelAr="البريد الإلكتروني" value={c.email} />
        </div>

        {/* System specifications */}
        <div className="mt-5">
          <div dir="rtl" className="text-right text-[11px] font-semibold">مواصفات نظام الغاز</div>
          <div className="grid grid-cols-2 gap-x-6 mt-2 text-[11px]">
            <PermitField labelAr="سعة التخزين" value={storageCapacity} />
            <PermitField labelAr="عدد الأسطوانات" value={cylinderCount} />

            <PermitField labelAr="نوع الغاز" value={app.fieldValues?.gasType || 'LPG (Mixed)'} />
            <PermitField labelAr="نوع النظام" value={app.fieldValues?.systemType || 'Centralised cylinder bank'} />
          </div>
        </div>

        {/* Validity */}
        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="تاريخ الإصدار" value={formatDate(app.approvedOn || app.submittedOn, { year: 'numeric', month: '2-digit', day: '2-digit' })} />
          <PermitField labelAr="تاريخ الانتهاء" value={formatDate(app.expiryDate || addYear(app.approvedOn), { year: 'numeric', month: '2-digit', day: '2-digit' })} />
        </div>

        <div className="mt-6 text-[10px]" dir="rtl">
          <div className="font-semibold">شروط وضوابط الاستخدام:</div>
          <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
            <li>الالتزام بكافة اشتراطات الدفاع المدني والسلامة العامة المعتمدة لدى دائرة الطاقة.</li>
            <li>إجراء الصيانة الدورية من خلال شركة معتمدة تمتلك عقد صيانة سنوية ساري المفعول.</li>
            <li>عدم إجراء أي تعديلات على المنظومة دون الحصول على موافقة كتابية مسبقة من دائرة الطاقة.</li>
            <li>إبلاغ دائرة الطاقة فورًا عن أي حادث أو تسرب أو خلل في النظام.</li>
          </ol>
        </div>

        <CertificateQR />
      </div>
    </div>
  );
}

// ============================================================================
// COC — Certificate of Completion (COC Enhancement SDD)
// ----------------------------------------------------------------------------
// Issued after Third-Party Inspection (TPI) confirms a gas system installation
// has been completed and tested to DoE standards. Captures inspector +
// installer + tested-system data.
// ============================================================================
function CocCertificateDocument({ app }: { app: Application }) {
  const c = app.company;
  const ref = certReference(app, 'COC');
  const premises = app.fieldValues?.premisesName || app.fieldValues?.buildingName || c.address;
  const installer = app.fieldValues?.installerCompany || c.name;
  const tpi = app.fieldValues?.tpiInspector || app.technicalStaff[0]?.name || '—';
  const inspectionDate = app.fieldValues?.inspectionDate || app.approvedOn;
  const testResult = app.fieldValues?.testResult || 'Pass — system commissioned within tolerance';

  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      <CertificateWatermark text="CERTIFICATE OF COMPLETION" />
      <div className="relative">
        <CertificateLetterhead />

        <p dir="rtl" className="text-[11px] text-right mt-4 leading-relaxed">
          صدرت شهادة إنجاز نظام الغاز بناءً على نتائج فحص الجهة الفاحصة المستقلة المعتمدة من قبل دائرة الطاقة، وفقًا لأحكام القانون رقم (5) لسنة 2023.
        </p>
        <p className="text-[10.5px] mt-2 leading-relaxed text-neutral-700">
          Issued upon the satisfactory inspection of a gas-system installation by a DoE-accredited Third-Party Inspector (TPI), under Law No. (5) of 2023.
        </p>

        <h2 dir="rtl" className="text-right font-bold text-[13.5px] mt-4">شهادة إنجاز أنظمة الغاز</h2>
        <h3 className="font-display font-bold text-[14px] mt-0.5">Certificate of Completion — Gas System Installation</h3>

        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="رقم الشهادة" value={ref} />
          <PermitField labelAr="رقم الطلب" value={app.applicationNumber} />

          <PermitField labelAr="اسم المبنى / المنشأة" value={premises} />
          <PermitField labelAr="عنوان المبنى" value={c.address} />

          <PermitField labelAr="اسم شركة التركيب" value={installer} />
          <PermitField labelAr="رقم السجل التجاري" value={c.tradePermitNumber} />

          <PermitField labelAr="الجهة الفاحصة (TPI)" value={tpi} />
          <PermitField labelAr="تاريخ الفحص" value={formatDate(inspectionDate, { year: 'numeric', month: '2-digit', day: '2-digit' })} />
        </div>

        {/* System tested */}
        <div className="mt-5">
          <div dir="rtl" className="text-right text-[11px] font-semibold">المنظومة المفحوصة</div>
          <div className="grid grid-cols-2 gap-x-6 mt-2 text-[11px]">
            <PermitField labelAr="نوع نظام الغاز" value={app.fieldValues?.gasSystemType || 'Centralised LPG'} />
            <PermitField labelAr="سعة النظام" value={app.fieldValues?.systemCapacity || '—'} />

            <PermitField labelAr="ضغط التشغيل" value={app.fieldValues?.operatingPressure || '21 mbar'} />
            <PermitField labelAr="عدد الفروع" value={app.fieldValues?.branchCount || '—'} />

            <PermitField labelAr="نتيجة الفحص" value={testResult} />
            <PermitField labelAr="مرجع تقرير الفحص" value={app.fieldValues?.tpiReportRef || ref + '-TPI'} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="تاريخ الإصدار" value={formatDate(app.approvedOn || app.submittedOn, { year: 'numeric', month: '2-digit', day: '2-digit' })} />
          <PermitField labelAr="نطاق الصلاحية" value="Valid for the installed system as inspected" />
        </div>

        <div className="mt-6 text-[10px]" dir="rtl">
          <div className="font-semibold">ملاحظات:</div>
          <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
            <li>تُعد الشهادة سارية لنطاق المنظومة المفحوصة المذكورة أعلاه فقط.</li>
            <li>أي تعديل لاحق على المنظومة يستوجب إعادة الفحص وإصدار شهادة جديدة.</li>
            <li>يحتفظ المالك بهذه الشهادة وبتقرير الجهة الفاحصة كمستند رسمي.</li>
          </ol>
        </div>

        <CertificateQR />
      </div>
    </div>
  );
}

// ============================================================================
// HOE — House of Expertise · Engineer Registration Certificate
// ----------------------------------------------------------------------------
// Issued to a qualified engineer registered to practise gas-system engineering
// within Abu Dhabi. Bound to a specific HoE (the engineering firm) and to the
// engineer's individual qualifications + scope of practice.
// ============================================================================
function HoeCertificateDocument({ app }: { app: Application }) {
  const c = app.company;
  const ref = certReference(app, 'HOE');
  const engineer = app.technicalStaff.find((s) => s.staffType === 'Engineer') ?? app.technicalStaff[0];
  const engName     = engineer?.name || app.fieldValues?.engineerName || c.ownerName;
  const engId       = engineer?.emiratesId || app.fieldValues?.engineerId || '—';
  const profession  = engineer?.position || app.fieldValues?.profession || 'Mechanical Engineer';
  const qualification = engineer?.education || app.fieldValues?.qualification || 'BSc Engineering';
  const yearsExp    = app.fieldValues?.yearsExperience || '—';
  const specialty   = app.fieldValues?.specialty || 'Gas Systems · LPG / SNG';

  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      <CertificateWatermark text="HOUSE OF EXPERTISE · ENGINEER" />
      <div className="relative">
        <CertificateLetterhead />

        <p dir="rtl" className="text-[11px] text-right mt-4 leading-relaxed">
          صدرت شهادة تسجيل المهندس استنادًا إلى القانون رقم (5) لسنة 2023، وقرار رئيس دائرة الطاقة بشأن تسجيل المهندسين في بيوت الخبرة المعتمدة لأعمال الغاز في إمارة أبوظبي.
        </p>
        <p className="text-[10.5px] mt-2 leading-relaxed text-neutral-700">
          Issued under Law No. (5) of 2023 and the DoE resolution regulating engineer registration with approved Houses of Expertise (HoE) for gas-system practice in Abu Dhabi.
        </p>

        <h2 dir="rtl" className="text-right font-bold text-[13.5px] mt-4">شهادة بيت الخبرة - تسجيل المهندس</h2>
        <h3 className="font-display font-bold text-[14px] mt-0.5">House of Expertise — Engineer Registration Certificate</h3>

        {/* Engineer identity */}
        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="رقم الشهادة" value={ref} />
          <PermitField labelAr="رقم الطلب" value={app.applicationNumber} />

          <PermitField labelAr="اسم المهندس" value={engName} />
          <PermitField labelAr="معرّف المهندس" value={engId} />

          <PermitField labelAr="الجنسية" value={engineer?.nationality || c.nationality} />
          <PermitField labelAr="رقم الهاتف" value={engineer?.phone || c.phone} />
        </div>

        {/* Qualification + practice */}
        <div className="mt-5">
          <div dir="rtl" className="text-right text-[11px] font-semibold">المؤهلات ونطاق الممارسة</div>
          <div className="grid grid-cols-2 gap-x-6 mt-2 text-[11px]">
            <PermitField labelAr="المهنة" value={profession} />
            <PermitField labelAr="التخصص الدقيق" value={specialty} />

            <PermitField labelAr="المؤهل العلمي" value={qualification} />
            <PermitField labelAr="سنوات الخبرة" value={yearsExp} />
          </div>
        </div>

        {/* HoE affiliation */}
        <div className="mt-5">
          <div dir="rtl" className="text-right text-[11px] font-semibold">بيت الخبرة المسجل لديه</div>
          <div className="grid grid-cols-2 gap-x-6 mt-2 text-[11px]">
            <PermitField labelAr="اسم بيت الخبرة" value={c.name} />
            <PermitField labelAr="رقم السجل التجاري" value={c.tradePermitNumber} />

            <PermitField labelAr="عنوان بيت الخبرة" value={c.address} />
            <PermitField labelAr="البريد الإلكتروني" value={c.email} />
          </div>
        </div>

        {/* Validity */}
        <div className="grid grid-cols-2 gap-x-6 mt-5 text-[11px]">
          <PermitField labelAr="تاريخ التسجيل" value={formatDate(app.approvedOn || app.submittedOn, { year: 'numeric', month: '2-digit', day: '2-digit' })} />
          <PermitField labelAr="تاريخ الانتهاء" value={formatDate(app.expiryDate || addYear(app.approvedOn), { year: 'numeric', month: '2-digit', day: '2-digit' })} />
        </div>

        <div className="mt-6 text-[10px]" dir="rtl">
          <div className="font-semibold">شروط الممارسة:</div>
          <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
            <li>يقتصر نطاق الممارسة على التخصص المسجل أعلاه ولا يجوز تجاوزه.</li>
            <li>يلتزم المهندس بمتطلبات التدريب المهني المستمر المعتمد من دائرة الطاقة.</li>
            <li>تُلغى الشهادة تلقائيًا عند انتهاء تسجيل بيت الخبرة المسجل لديه.</li>
          </ol>
        </div>

        <CertificateQR />
      </div>
    </div>
  );
}

function PermitField({ labelAr, value }: { labelEn?: string; labelAr: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1 border-b border-neutral-200">
      <div className="text-[11px] flex-1 min-w-0 break-words">{value || '-'}</div>
      <div className="text-neutral-400 text-[11px]">:</div>
      <div className="text-[11px] text-neutral-700 text-right" dir="rtl" style={{ width: 150 }}>{labelAr}</div>
    </div>
  );
}

function CategoryRow({ code, labelAr, checked }: { code: string; labelAr: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <div className="text-[10.5px] flex-1 text-right">{labelAr} - ({code})</div>
      <div className={cn('w-4 h-4 border border-ink-950 grid place-items-center', checked && 'bg-white')}>
        {checked && <span className="text-[12px] leading-none">✓</span>}
      </div>
    </div>
  );
}

function addYear(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="col-span-full text-center py-12 text-[12.5px] text-neutral-500">
      <div className="text-[24px] mb-2">🔍</div>
      {message}
    </div>
  );
}

// ====================================================================== Audit / Comments

function AuditHistory({ app, svc }: { app: Application; svc: import('../types').ServiceDefinition }) {
  const entries = enrichTimeline(app, svc);
  return (
    <ol className="relative space-y-4 ml-2 pl-6 border-l-2 border-action-orange/15">
      {entries.map((t) => (
        <li key={t.id} className="relative">
          <span className={cn('absolute -left-[33px] top-1 w-6 h-6 rounded-full grid place-items-center ring-4 ring-white', t.iconBg)}>
            {t.icon}
          </span>
          <div className="bg-white border border-neutral-100 rounded-lg p-3 shadow-doe-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <strong className="text-[13px] text-ink-950">{t.title}</strong>
                <span className={cn('chip-sm uppercase tracking-wider', t.badgeCls)}>{t.badge}</span>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-mono text-neutral-700">{formatDateTime(t.at)}</div>
                {t.relative && <div className="text-[10.5px] text-neutral-400">{t.relative}</div>}
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-info-soft text-info-500 grid place-items-center font-bold text-[9px]">
                {t.actor.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="text-[11.5px] text-neutral-500">{t.actor}{t.actorRole ? ` · ${t.actorRole}` : ''}</div>
            </div>
            {t.note && (
              <div className="mt-2 text-[12px] text-neutral-700 bg-neutral-50 border border-neutral-100 rounded px-3 py-2">{t.note}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

interface CommentRecord {
  id: string;
  name: string;
  role: string;
  tag?: string;
  internal: boolean;
  at: string;
  body: string;
  replyToId?: string;
}

function CommentsThread({ newComment, setNewComment, internal, setInternal, user }: {
  newComment: string; setNewComment: (s: string) => void; internal: boolean; setInternal: (b: boolean) => void;
  user: { name: string; role: string };
}) {
  const samples: CommentRecord[] = [
    { id: '1', name: 'Fatima Al Hashemi', role: 'Applicant', tag: 'TSME', internal: false, at: '08 May 2026 · 09:14', body: 'Application submitted with updated workshop address and renewed HSE certificate. Available for any clarifications on contact number above.' },
    { id: '2', name: 'Sara Choudhury',    role: 'PPS Coordinator', internal: true, at: '08 May 2026 · 10:42', replyToId: '1', body: 'Routed to Omar for initial technical review. Workshop relocation is the only structural change since prior registration — flag for staff certification cross-check.' },
    { id: '3', name: 'Omar Hassan',       role: 'PPS Engineer', internal: true, at: '09 May 2026 · 14:08', body: 'QA/QC inspector (Noura Al Ali) verification still pending against MoHRE records — proceeding with review; will request clarification only if other gaps surface.' },
  ];

  const [filter, setFilter] = useState<'all' | 'internal' | 'external'>('all');
  const visible = samples.filter((c) =>
    filter === 'all' ? true : filter === 'internal' ? c.internal : !c.internal,
  );

  const currentInitials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const charLimit = 1000;

  return (
    <div>
      {/* Filter pills */}
      <div className="flex items-center gap-1 mb-4 text-[11.5px]">
        {(['all', 'internal', 'external'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2.5 h-6 rounded-full font-semibold uppercase tracking-wider transition',
              filter === f
                ? 'bg-ink-950 text-white'
                : 'bg-white border border-neutral-200 text-neutral-500 hover:text-ink-950',
            )}
          >
            {f === 'all' ? `All · ${samples.length}` : f === 'internal' ? `Internal · ${samples.filter((c) => c.internal).length}` : `External · ${samples.filter((c) => !c.internal).length}`}
          </button>
        ))}
      </div>

      {/* Threads */}
      <div className="space-y-3">
        {visible.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            replyTarget={c.replyToId ? samples.find((x) => x.id === c.replyToId) : undefined}
          />
        ))}
        {visible.length === 0 && (
          <div className="text-[12.5px] text-neutral-500 text-center py-8">No {filter} comments yet.</div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-6 pt-5 border-t border-neutral-100">
        <div className="flex gap-3">
          <Avatar name={user.name} size={36} />
          <div className="flex-1">
            <div className={cn(
              'rounded-lg border bg-white transition focus-within:ring-2 overflow-hidden',
              internal
                ? 'border-neutral-200 border-l-[3px] border-l-warning-500/70 focus-within:border-warning-500 focus-within:ring-warning-500/15'
                : 'border-neutral-200 focus-within:border-action-orange focus-within:ring-action-orange/15',
            )}>
              {internal && (
                <div className="flex items-center gap-1.5 px-3 pt-2 text-[10px] font-sans uppercase tracking-[0.16em] text-warning-500">
                  <LockSmall /> Internal note · not visible to the applicant
                </div>
              )}
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, charLimit))}
                placeholder={internal
                  ? 'Add an internal note for the next reviewer…'
                  : 'Reply to the applicant or PPS team…'}
                className="w-full p-3 bg-transparent border-0 text-[13px] min-h-[88px] focus:outline-none resize-none placeholder:text-neutral-400"
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-2 border-t border-neutral-100 pt-2">
                <div className="flex items-center gap-1 text-neutral-400">
                  <ToolbarBtn title="Bold"><strong>B</strong></ToolbarBtn>
                  <ToolbarBtn title="Italic"><em>I</em></ToolbarBtn>
                  <ToolbarBtn title="Attach"><AttachIcon /></ToolbarBtn>
                  <ToolbarBtn title="Mention">@</ToolbarBtn>
                </div>
                <div className="text-[10.5px] font-mono text-neutral-400">
                  {newComment.length} / {charLimit}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2.5">
              <label className="flex items-center gap-2 text-[12px] text-neutral-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-neutral-300 text-warning-500 focus:ring-warning-500"
                />
                Post as <strong className={cn(internal && 'text-warning-500')}>{internal ? 'internal note' : 'public reply'}</strong>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-500">Posting as {user.name} ({user.role})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewComment('')}
                  disabled={!newComment.trim()}
                  className="h-8 px-3 rounded-md bg-white border border-neutral-200 text-neutral-700 text-[12px] font-semibold hover:bg-neutral-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  disabled={!newComment.trim()}
                  className={cn(
                    'h-8 px-3.5 rounded-md text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40',
                    internal ? 'bg-warning-500 hover:opacity-90' : 'bg-action-orange hover:bg-action-orange-dark',
                  )}
                >
                  {internal ? 'Post internal note' : 'Post comment'} <SendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, replyTarget }: { comment: CommentRecord; replyTarget?: CommentRecord }) {
  const isInternal = comment.internal;
  const isApplicant = comment.role === 'Applicant';
  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg p-3 transition relative',
        isInternal
          ? 'bg-white border border-neutral-100 border-l-[3px] border-l-warning-500/70'
          : 'bg-white border border-neutral-100',
      )}
    >
      <Avatar name={comment.name} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <strong className="text-[13px] text-ink-950 leading-none">{comment.name}</strong>
          <span className={cn(
            'inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider',
            isApplicant ? 'bg-info-soft text-info-500' : 'bg-neutral-100 text-neutral-700',
          )}>
            {comment.role}{comment.tag ? ` · ${comment.tag}` : ''}
          </span>
          {isInternal && (
            <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-warning-soft text-warning-500">
              <LockSmall /> Internal
            </span>
          )}
          <span className="ml-auto text-[10.5px] font-mono text-neutral-500">{comment.at}</span>
        </div>

        {replyTarget && (
          <div className="my-2 border-l-2 border-action-orange/40 pl-2.5 text-[11.5px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-neutral-700">{replyTarget.name}</span>
              <span className="text-neutral-400">·</span>
              <span className="italic">{replyTarget.role}</span>
            </div>
            <p className="line-clamp-2">{replyTarget.body}</p>
          </div>
        )}

        <p className="text-[13px] text-ink-950 leading-relaxed">{comment.body}</p>

        <div className="mt-2 flex items-center gap-1 text-[11.5px] text-neutral-500">
          <CommentAction icon={<ReplyIcon />}>Reply</CommentAction>
          <CommentAction icon={<QuoteIcon />}>Quote</CommentAction>
          <CommentAction icon={<LinkIcon />}>Copy link</CommentAction>
        </div>
      </div>
    </div>
  );
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  // Deterministic colour from name hash so each user keeps the same colour.
  const palette: { bg: string; fg: string }[] = [
    { bg: 'bg-info-soft', fg: 'text-info-500' },
    { bg: 'bg-action-orange-soft', fg: 'text-action-orange-deep' },
    { bg: 'bg-success-soft', fg: 'text-success-500' },
    { bg: 'bg-lavender', fg: 'text-[#7B3FE4]' },
    { bg: 'bg-doe-red-soft', fg: 'text-doe-red' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  const c = palette[hash % palette.length];
  return (
    <div
      className={cn('rounded-full grid place-items-center font-bold flex-shrink-0', c.bg, c.fg)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials}
    </div>
  );
}

function CommentAction({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button className="inline-flex items-center gap-1 h-6 px-1.5 rounded hover:bg-neutral-100 hover:text-ink-950">
      <span className="opacity-70">{icon}</span>
      {children}
    </button>
  );
}
function ToolbarBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return <button type="button" title={title} className="w-7 h-7 rounded grid place-items-center text-[12px] hover:bg-neutral-100">{children}</button>;
}
function LockSmall() { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>; }
function ReplyIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>; }
function QuoteIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1-1-2-2-2H4c-1 0-2 1-2 2v6c0 1 1 2 2 2h3"/><path d="M14 21c3 0 7-1 7-8V5c0-1-1-2-2-2h-4c-1 0-2 1-2 2v6c0 1 1 2 2 2h3"/></svg>; }
function LinkIcon()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 1 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l2-2"/></svg>; }
function AttachIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>; }
function SendIcon()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }

// ====================================================================== Sidebar pieces

function CompanyCard({ app }: { app: Application }) {
  const initials = abbrev(app.company.name);
  return (
    <div className="card overflow-hidden relative">
      {/* Tall green banner */}
      <div
        className="h-[68px] relative"
        style={{ background: 'linear-gradient(135deg, #1E6F4F 0%, #155138 100%)' }}
      >
        {/* TS Avatar overlapping the banner — half in banner, half below */}
        <div className="absolute left-5 -bottom-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 grid place-items-center font-display font-bold text-[14px] text-ink-950 shadow-doe-xs">{initials.slice(0, 2)}</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success-500 ring-2 ring-white" />
          </div>
        </div>
      </div>

      <div className="p-5 pt-7">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-ink-950">{initials}</div>
            <div className="text-[11.5px] text-neutral-500 leading-tight mt-0.5">{app.company.name}</div>
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 h-5 px-2 rounded-md bg-neutral-50 border border-neutral-200 text-[10.5px] font-semibold text-neutral-700">
            Trade Licence
            <span className="font-mono text-neutral-900">{app.company.tradePermitNumber}</span>
          </span>
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-100">
          <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-3">Company Details</div>
          <div className="space-y-2.5 text-[12px]">
            <Row k="Entity Type"      v={legalStatusShort(app.company.legalStatus)} />
            <Row k="Registered Since" v={String(new Date(app.company.establishmentDate).getFullYear())} />
            <Row k="Location"         v={shortAddress(app.company.address)} />
            <Row k="Activity"         v={app.company.businessActivity} align="right" multi />
          </div>
        </div>
      </div>
    </div>
  );
}

function CompanySnapshot({ app }: { app: Application }) {
  const [open, setOpen] = useState(true);
  const c = app.company;
  return (
    <div className="card">
      <button onClick={() => setOpen((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10.5px] font-sans uppercase tracking-[0.16em] text-action-orange-deep">
          <span className="w-4 h-4 rounded bg-action-orange-soft grid place-items-center text-[10px]">📊</span>
          Company Snapshot
        </div>
        <span className={cn('text-neutral-400 transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3 space-y-2 text-[12px]">
          <Row k="Trade Licence"     v={<span className="font-mono">{c.tradePermitNumber}</span>} />
          <Row k="Permit Expiry"     v={formatDate(c.tradePermitExpiryDate)} />
          <Row k="Established"       v={formatDate(c.establishmentDate)} />
          <Row k="Area of Operations" v={app.areaOfOperations || 'Abu Dhabi · Al Ain'} />
          <div className="pt-2 mt-2 border-t border-neutral-100">
            <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">Registered Address</div>
            <div className="text-[12px] text-ink-950 leading-relaxed">{c.address}<br />PO Box {c.poBox}, UAE</div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryContactCard({ app }: { app: Application }) {
  const [open, setOpen] = useState(true);
  const submitter = app.timeline.find((t) => t.byUserRole === 'applicant');
  const c = app.company;
  return (
    <div className="card">
      <button onClick={() => setOpen((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-700">
          <span>👤</span>
          Primary Contact
        </div>
        <span className={cn('text-neutral-400 transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3 space-y-3 text-[12px]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-info-soft text-info-500 grid place-items-center font-bold text-[10px]">{(submitter?.byUserName || 'TU').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div>
              <div className="text-[12.5px] font-semibold text-ink-950">{submitter?.byUserName || 'Unknown'}</div>
              <div className="text-[11px] text-neutral-500">Authorised Submitter</div>
            </div>
          </div>
          <Row k={<span className="flex items-center gap-1.5"><span>📞</span> Phone</span>} v={<span className="font-mono">{c.phone}</span>} />
          <Row k={<span className="flex items-center gap-1.5"><span>✉</span> Email</span>}  v={<a href={`mailto:${c.email}`} className="text-info-500 hover:underline">{c.email}</a>} />
          {c.website && <Row k={<span className="flex items-center gap-1.5"><span>🌐</span> Website</span>} v={<a href={c.website} className="text-info-500 hover:underline" target="_blank" rel="noreferrer">{c.website.replace(/^https?:\/\//, '')}</a>} />}
        </div>
      )}
    </div>
  );
}

function ReviewSummary({ app }: { app: Application }) {
  const [open, setOpen] = useState(true);
  const checks = [
    { label: 'Trade permit valid & current',            status: 'PASS' },
    { label: 'Articles of Association attested',         status: 'PASS' },
    { label: 'ISO & HSE certificates uploaded',          status: 'PASS' },
    { label: 'Workshop ownership verified',              status: 'PASS' },
    { label: 'QA/QC staff verification (1)',             status: 'PENDING' },
    { label: 'Reference projects (3 completed)',         status: 'PASS' },
    { label: 'Financial report (audited)',               status: 'PASS' },
    { label: 'SLA timer within bounds',                  status: 'PASS', meta: '2d 04h' },
  ];
  const completed = checks.filter((c) => c.status === 'PASS').length;
  const pct = Math.round((completed / checks.length) * 100);
  return (
    <div className="card">
      <button onClick={() => setOpen((v) => !v)} className="w-full px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10.5px] font-sans uppercase tracking-[0.16em] text-action-orange-deep">
          <span>✓</span>
          Review Summary
        </div>
        <span className={cn('text-neutral-400 transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-neutral-100 pt-3">
          <div className="bg-action-orange-soft/40 border border-action-orange/20 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-sans uppercase tracking-wider text-action-orange-deep">Validation</div>
              <div className="text-[12px] font-bold text-action-orange-deep">{pct}%</div>
            </div>
            <div className="h-1.5 rounded-full bg-white overflow-hidden mb-2">
              <div className="h-full bg-action-orange rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-[11px] text-action-orange-deep"><strong>{completed} of {checks.length}</strong> checks complete · 1 pending verification</div>
          </div>
          <ul className="space-y-2 text-[11.5px]">
            {checks.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-ink-950">
                  <span className={cn('w-4 h-4 rounded-full grid place-items-center text-[10px]', c.status === 'PASS' ? 'text-success-500' : 'text-action-orange-deep')}>
                    {c.status === 'PASS' ? '✓' : '⏱'}
                  </span>
                  {c.label}
                </span>
                <span className={cn('font-sans text-[10px] font-semibold uppercase', c.status === 'PASS' ? 'text-success-500' : 'text-action-orange-deep')}>{c.meta || c.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ====================================================================== Primitives

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] font-sans uppercase tracking-[0.18em] text-action-orange-deep">
      <span className="inline-block w-0.5 h-3 bg-action-orange" />
      {label}
    </div>
  );
}

function Card({ children, padding = 'p-6' }: { children: React.ReactNode; padding?: string }) {
  return <div className={cn('card', padding)}>{children}</div>;
}

function Field({ label, value, mono, small, align = 'left' }: { label: string; value: React.ReactNode; mono?: boolean; small?: boolean; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 mb-1">{label}</div>
      <div className={cn(small ? 'text-[12px]' : 'text-[13px]', 'text-ink-950', mono && 'font-mono')}>{value || '—'}</div>
    </div>
  );
}

function Row({ k, v, align = 'right', multi }: { k: React.ReactNode; v: React.ReactNode; align?: 'left' | 'right'; multi?: boolean }) {
  return (
    <div className={cn('flex gap-2', multi ? 'items-start' : 'items-center')}>
      <span className="text-neutral-500 flex-shrink-0">{k}</span>
      <span className={cn('text-ink-950 flex-1', align === 'right' && 'text-right')}>{v}</span>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-doe-xl max-w-[520px] w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-[18px] font-bold text-ink-950">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-ink-950">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({
  transition, comment, setComment, onCancel, onConfirm, user, app,
}: {
  transition: TransitionDef;
  comment: string;
  setComment: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  user: { name: string; role: string };
  app: Application;
}) {
  const v = transition.variant ?? 'primary';
  const summary = describeTransition(transition, app);
  const commentRequired = !!transition.requiresComment;

  // Choose a confirm button colour matching the action variant
  const btnCls =
    v === 'danger'    ? 'bg-danger-500 text-white hover:opacity-90' :
    v === 'warning'   ? 'bg-warning-500 text-white hover:opacity-90' :
    v === 'success'   ? 'bg-success-500 text-white hover:opacity-90' :
    v === 'secondary' ? 'bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50' :
                        'bg-action-orange text-white hover:bg-action-orange-dark';

  return (
    <div>
      {/* Summary line */}
      <div className="rounded-md bg-neutral-50 border border-neutral-100 p-3 mb-3">
        <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">You are about to</div>
        <div className="text-[13px] text-ink-950 leading-snug">{summary}</div>
      </div>

      {/* Comment field */}
      <div>
        <label className="flex items-center justify-between mb-1.5">
          <span className="text-[11.5px] font-semibold text-ink-950">
            {transition.commentLabel || (commentRequired ? 'Add a comment' : 'Add a comment (optional)')}
          </span>
          {commentRequired && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-danger-500">Required</span>
          )}
        </label>
        <textarea
          autoFocus
          className="w-full p-2.5 border border-neutral-200 rounded-md text-[13px] min-h-[110px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 1000))}
          placeholder={
            commentRequired
              ? 'Required — explain the decision for the audit trail.'
              : 'Optional — add a note for the next reviewer or the audit trail.'
          }
        />
        <div className="flex items-center justify-between mt-1.5 text-[10.5px] font-mono text-neutral-400">
          <span>Posting as <strong className="text-neutral-700">{user.name}</strong> · {user.role}</span>
          <span>{comment.length} / 1000</span>
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-2 mt-4">
        <button
          className="btn bg-white border border-neutral-200 text-neutral-900 hover:bg-neutral-50"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className={cn('ml-auto', 'btn', btnCls)}
          onClick={onConfirm}
          disabled={commentRequired && !comment.trim()}
        >
          {confirmLabel(transition)}
        </button>
      </div>
    </div>
  );
}

function describeTransition(t: TransitionDef, app: Application): string {
  const appNo = app.applicationNumber;
  switch (t.id) {
    case 'submit':                  return `Submit application ${appNo} to the Department of Energy for review.`;
    case 'engineer-approve':        return `Endorse application ${appNo} and forward to the PPS Section Head for next-level review.`;
    case 'engineer-return':         return `Return application ${appNo} to the applicant for modification. They have 60 business days to resubmit.`;
    case 'sh-approve':              return `Approve application ${appNo} and forward to the PPS Director for final decision.`;
    case 'sh-request-info':         return `Send application ${appNo} back to the PPS Engineer for additional information.`;
    case 'sh-reject':               return `Reject application ${appNo}. The applicant will be notified by email.`;
    case 'director-approve':        return `Issue final approval for application ${appNo} and request fee payment from the applicant.`;
    case 'director-request-info':   return `Send application ${appNo} back to the PPS Section Head for additional review.`;
    case 'director-reject':         return `Reject application ${appNo}. The applicant will be notified by email.`;
    case 'eng-resubmit-to-sh':      return `Re-endorse application ${appNo} back to the PPS Section Head with your updated notes.`;
    case 'sh-resubmit-to-director': return `Re-endorse application ${appNo} back to the PPS Director with your updated notes.`;
    default:                        return `Move application ${appNo} via "${t.label}".`;
  }
}

function confirmLabel(t: TransitionDef): string {
  if ((t.variant ?? 'primary') === 'danger') return 'Confirm rejection';
  if (t.id === 'submit') return 'Submit application';
  if (t.id.includes('approve')) return 'Confirm approval';
  if (t.id.includes('return') || t.id.includes('request-info')) return 'Confirm & send back';
  return 'Confirm';
}

// ====================================================================== Helpers

function abbrev(name: string) {
  const words = name.split(/[\s\-&]/).filter((w) => /^[A-Z]/.test(w));
  if (words.length >= 2) return words.slice(0, 4).map((w) => w[0]).join('').toUpperCase();
  return name.slice(0, 4).toUpperCase();
}
function legalStatusShort(s: string) {
  if (/limited liability/i.test(s)) return 'LLC';
  if (/sole/i.test(s)) return 'Sole Est.';
  return s;
}
function shortAddress(address: string) {
  const parts = address.split(',');
  return parts.slice(0, 2).join(',').trim();
}
function monthsUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(diff / (30 * 24 * 3600 * 1000)));
}
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function registrationCategoryLabel(cat?: string) {
  switch (cat) {
    case 'A': return 'Category A — Installation, maintenance & operations (filling + decanting)';
    case 'B': return 'Category B — Installation, maintenance & operations (filling)';
    case 'C': return 'Category C — Installation & maintenance';
    case 'D': return 'Category D — New Establishments (cylinder systems only)';
    default:  return '—';
  }
}
function applicantRemarks(app: Application) {
  return (
    app.timeline.find((t) => t.byUserRole === 'applicant' && t.comment)?.comment ||
    `Establishment renewing operations after relocation to new workshop facility in ICAD-1. All technical staff retained from previous registration cycle. Workshop facility ownership documents and updated HSE certificate (${new Date().getFullYear()}) attached. Reference projects include three completed gas-system installations under Etihad WE.`
  );
}
function owerArabic(name: string) {
  // Stylised Arabic transliteration placeholder
  const map: Record<string, string> = {
    'Khalid Bin Sultan Al Mazrouei': 'خالد بن سلطان المزروعي',
    'Ahmed Al Suwaidi':              'أحمد السويدي',
    'Khalid Bin Rashid':             'خالد بن راشد',
    'Fatima Al Hashemi':             'فاطمة الهاشمي',
    'Mohammed Al Mansouri':          'محمد المنصوري',
    'Sara Al Hashimi':               'سارة الهاشمي',
    'Hashim Al Hashemi':             'هاشم الهاشمي',
  };
  return map[name] || 'خالد بن سلطان المزروعي';
}
function requiredAttachmentCount(svc: import('../types').ServiceDefinition, app: Application) {
  const section = svc.form.find((s) => s.id === 'company-info' || s.id === 'premises-info') ?? svc.form[0];
  if (!section || !section.attachments) return 0;
  return section.attachments.filter((a) => a.required === true || (typeof a.required === 'object' && app.category && a.required.whenCategory.includes(app.category))).length;
}

function enrichTimeline(app: Application, svc: import('../types').ServiceDefinition) {
  // Build a richer audit timeline with assigned/approved/etc. visual variants.
  return app.timeline.map((t, idx) => {
    const action = t.action.toLowerCase();
    let badge = 'EVENT', badgeCls = 'bg-neutral-100 text-neutral-700', icon: React.ReactNode = '·', iconBg = 'bg-neutral-200 text-neutral-700';
    if (action.includes('submit')) { badge = 'SUBMITTED'; badgeCls = 'bg-info-soft text-info-500'; icon = '✓'; iconBg = 'bg-success-500 text-white'; }
    else if (action.includes('approv') || action.includes('endorse') || action.includes('forward')) { badge = 'APPROVED'; badgeCls = 'bg-success-soft text-success-500'; icon = '✓'; iconBg = 'bg-success-500 text-white'; }
    else if (action.includes('return') || action.includes('request')) { badge = 'RETURNED'; badgeCls = 'bg-warning-soft text-warning-500'; icon = '↺'; iconBg = 'bg-warning-500 text-white'; }
    else if (action.includes('reject')) { badge = 'REJECTED'; badgeCls = 'bg-danger-soft text-danger-500'; icon = '✕'; iconBg = 'bg-danger-500 text-white'; }
    else if (action.includes('pay')) { badge = 'PAID'; badgeCls = 'bg-action-orange-soft text-action-orange-deep'; icon = '$'; iconBg = 'bg-action-orange text-white'; }
    const toState = getState(svc, t.toState);
    return {
      id: t.id,
      title: `${t.action}${toState && action.includes('approv') ? ` · ${toState.label}` : ''}`,
      badge, badgeCls,
      icon, iconBg,
      at: t.at,
      relative: idx > 0 ? humanGap(app.timeline[idx - 1].at, t.at) : undefined,
      actor: t.byUserName,
      actorRole: roleLabel(t.byUserRole),
      note: t.comment,
    };
  });
}

function humanGap(a: string, b: string) {
  const diff = new Date(b).getTime() - new Date(a).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m later`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m later`;
  const d = Math.floor(h / 24);
  return `~${d} day${d > 1 ? 's' : ''} later`;
}

// ====================================================================== Sample data fallback

const SAMPLE_STAFF = [
  { name: 'Rajesh Menon',         position: 'Sr. Gas Engineer · Technical Lead', nationality: 'India',         emiratesId: '784-1985-6543210-2', phone: '+971 50 882 1140', email: 'r.menon@tsme.ae',        education: 'B.Tech Mechanical, ASNT Level II',           staffType: 'Engineer'   as const, technicianType: undefined },
  { name: 'Saif Al Mansoori',     position: 'Gas Systems Engineer',              nationality: 'UAE',           emiratesId: '784-1990-1122334-5', phone: '+971 55 442 7820', email: 's.mansoori@tsme.ae',     education: 'B.E. Petroleum Engineering',                 staffType: 'Engineer'   as const, technicianType: undefined },
  { name: 'Mohammed Khan',        position: 'HSE Officer',                       nationality: 'Pakistan',      emiratesId: '784-1988-7766554-4', phone: '+971 56 711 2003', email: 'm.khan@tsme.ae',         education: 'NEBOSH IGC · OSHA 30',                       staffType: 'Engineer'   as const, technicianType: undefined },
  { name: 'Noura Al Ali',         position: 'QA / QC Inspector',                 nationality: 'UAE',           emiratesId: '784-1992-3344556-7', phone: '+971 50 119 3344', email: 'n.alali@tsme.ae',        education: 'B.Sc. Mechanical Engineering',               staffType: 'Technician' as const, technicianType: 'Supervisor' },
  { name: 'Ahmed El-Sayed',       position: 'Project Manager',                   nationality: 'Egypt',         emiratesId: '784-1980-2233445-1', phone: '+971 50 224 8801', email: 'a.elsayed@tsme.ae',      education: 'M.Sc. Construction Mgmt · PMP',              staffType: 'Engineer'   as const, technicianType: undefined },
  { name: 'Suresh Pillai',        position: 'Pipeline Welder',                   nationality: 'India',         emiratesId: '784-1987-5588990-3', phone: '+971 55 332 1190', email: 's.pillai@tsme.ae',       education: 'ITI Welding · ASME IX qualified',            staffType: 'Technician' as const, technicianType: 'Welder' },
  { name: 'Bilal Anwar',          position: 'Pipefitter',                        nationality: 'Pakistan',      emiratesId: '784-1991-9988770-2', phone: '+971 52 110 5567', email: 'b.anwar@tsme.ae',        education: 'Diploma Mechanical Fitter · Lahore Poly',   staffType: 'Technician' as const, technicianType: 'Fitter' },
  { name: 'Hessa Al Mazrouei',    position: 'Compliance Engineer',               nationality: 'UAE',           emiratesId: '784-1993-1187660-4', phone: '+971 50 887 4422', email: 'h.almazrouei@tsme.ae',   education: 'B.Sc. Chemical Engineering · UAEU',          staffType: 'Engineer'   as const, technicianType: undefined },
  { name: 'Joseph Karim',         position: 'CAD Draftsman',                     nationality: 'Lebanon',       emiratesId: '784-1989-4477880-5', phone: '+971 56 998 2210', email: 'j.karim@tsme.ae',        education: 'AutoCAD Certified · BIM Level 2',           staffType: 'Technician' as const, technicianType: 'Draftsman' },
  { name: 'Imran Sheikh',         position: 'Gas Network Designer',              nationality: 'Pakistan',      emiratesId: '784-1986-3322110-7', phone: '+971 50 442 3399', email: 'i.sheikh@tsme.ae',       education: 'B.E. Petroleum · Pipeline Stress Cert',     staffType: 'Engineer'   as const, technicianType: undefined },
  { name: 'Khaled Saif',          position: 'Site Supervisor',                   nationality: 'Jordan',        emiratesId: '784-1984-6655440-8', phone: '+971 55 776 8821', email: 'k.saif@tsme.ae',         education: 'Diploma Civil · 15 yrs site experience',    staffType: 'Technician' as const, technicianType: 'Supervisor' },
  { name: 'Anika Sharma',         position: 'NDT Inspector',                     nationality: 'India',         emiratesId: '784-1994-2244660-1', phone: '+971 50 113 7700', email: 'a.sharma@tsme.ae',       education: 'ASNT Level III RT, UT, PT',                  staffType: 'Technician' as const, technicianType: 'Supervisor' },
];

const SAMPLE_PROJECTS = [
  { projectName: 'Yas Mall District Gas Network',           subtitle: 'Central gas distribution for retail complex',         clientName: 'Aldar Properties',         location: 'Yas Island, Abu Dhabi',         scope: ['Gas Distribution Network'],                                   agreementValue: 12400000, startDate: '2024-03-15', endDate: '2024-11-28', type: 'Installation' },
  { projectName: 'Mussafah Industrial Gas Maintenance',     subtitle: 'Annual contract — multiple sites',                    clientName: 'SENAAT Group',             location: 'Mussafah, Abu Dhabi',           scope: ['Gas Plant', 'Gas Distribution Network'],                      agreementValue:  6800000, startDate: '2025-01-01', endDate: '2026-12-31', type: 'Maintenance' },
  { projectName: 'Saadiyat Residential Towers — Phase 2',   subtitle: 'High-rise gas piping installation',                   clientName: 'Aldar Properties',         location: 'Saadiyat Island, Abu Dhabi',    scope: ['Gas Distribution Network', 'Building Utilization'],           agreementValue:  9800000, startDate: '2023-09-10', endDate: '2024-08-05', type: 'Installation' },
  { projectName: 'Al Ain Hospital Auxiliary Gas System',    subtitle: 'Medical-grade gas distribution upgrade',              clientName: 'SEHA',                     location: 'Al Ain, Abu Dhabi',             scope: ['Building Utilization'],                                       agreementValue:  4200000, startDate: '2026-08-22', endDate: '',           type: 'Installation' },
  { projectName: 'ADNOC Ruwais Refinery Gas Inspection',    subtitle: 'Third-party pipeline integrity inspection',           clientName: 'ADNOC Refining',           location: 'Ruwais, Al Dhafra',             scope: ['Gas Plant', 'Gas Transportation'],                            agreementValue:  3500000, startDate: '2025-06-01', endDate: '2025-12-15', type: 'Inspection' },
  { projectName: 'Khalifa Industrial Zone Pipeline Audit',  subtitle: 'Compliance audit · 28km gas distribution main',       clientName: 'KIZAD Authority',          location: 'Khalifa Industrial Zone',       scope: ['Gas Distribution Network', 'Gas Transportation'],             agreementValue:  2900000, startDate: '2024-10-01', endDate: '2025-03-31', type: 'Audit' },
  { projectName: 'Reem Island Marina LPG Backup',           subtitle: 'Mooring-side cylinder bank for emergency power',       clientName: 'Reem Investments',         location: 'Al Reem Island, Abu Dhabi',     scope: ['Gas Distribution Network'],                                   agreementValue:  1850000, startDate: '2023-04-10', endDate: '2023-11-20', type: 'Installation' },
  { projectName: 'Bani Yas Schools Gas Safety Retrofit',    subtitle: 'Retrofit 14 schools to current safety code',          clientName: 'ADEK',                     location: 'Bani Yas, Abu Dhabi',           scope: ['Building Utilization'],                                       agreementValue:  3200000, startDate: '2024-07-22', endDate: '2025-02-28', type: 'Installation' },
  { projectName: 'Etihad WE Substation Gas Line Survey',    subtitle: 'Pre-construction underground utility survey',         clientName: 'Etihad WE',                location: 'Mafraq, Abu Dhabi',             scope: ['Gas Transportation'],                                         agreementValue:  1100000, startDate: '2024-02-05', endDate: '2024-05-30', type: 'Inspection' },
  { projectName: 'Mubadala HQ Backup Gas Plant',            subtitle: 'Standby cogeneration with biogas readiness',          clientName: 'Mubadala Investment Co.',  location: 'Al Maryah Island, Abu Dhabi',   scope: ['Gas Plant', 'Building Utilization'],                          agreementValue: 14600000, startDate: '2025-09-15', endDate: '2026-10-30', type: 'Installation' },
  { projectName: 'EAD Mangrove Centre Cooking Gas Upgrade', subtitle: 'Restaurant kitchen LPG to mains gas conversion',      clientName: 'Environment Agency AD',    location: 'Eastern Mangroves, Abu Dhabi',  scope: ['Building Utilization', 'Food Establishment'],                 agreementValue:   850000, startDate: '2024-11-10', endDate: '2025-02-15', type: 'Installation' },
  { projectName: 'TAQA Power Station Gas Compliance Audit', subtitle: 'Annual regulatory compliance review',                 clientName: 'TAQA',                     location: 'Shuweihat, Al Dhafra',          scope: ['Gas Plant'],                                                  agreementValue:  1750000, startDate: '2025-04-01', endDate: '2025-06-30', type: 'Audit' },
  { projectName: 'Capital Centre Towers Gas Riser Replace', subtitle: 'Vertical riser replacement on 3 towers',              clientName: 'ADNEC',                    location: 'Al Khaleej Al Arabi, Abu Dhabi',scope: ['Gas Distribution Network', 'Building Utilization'],           agreementValue:  4750000, startDate: '2026-01-15', endDate: '2026-09-30', type: 'Installation' },
  { projectName: 'Sheikh Zayed Mosque Visitor Centre Gas',  subtitle: 'Decanting station for catering operations',           clientName: 'SZGMC',                    location: 'Abu Dhabi City',                scope: ['Building Utilization', 'Food Establishment'],                 agreementValue:  1380000, startDate: '2024-05-05', endDate: '2024-10-20', type: 'Installation' },
  { projectName: 'Al Falah Community Gas Network Phase 1',  subtitle: '1,200 villa connection · district gas',               clientName: 'Modon Properties',         location: 'Al Falah, Abu Dhabi',           scope: ['Gas Distribution Network'],                                   agreementValue: 22100000, startDate: '2026-03-01', endDate: '',           type: 'Installation' },
];

// ====================================================================== Icons + small chip util via tailwind

function Chev() { return <span className="text-neutral-300">›</span>; }
function CopyIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>; }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function EyeIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function BuildingIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 6h.01"/><path d="M15 6h.01"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M9 14h.01"/><path d="M15 14h.01"/><path d="M10 22V18a2 2 0 0 1 4 0v4"/></svg>; }
function UsersIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function FolderIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>; }
function DocIcon()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
function ClockIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function CommentIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function SearchIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function GridIcon()     { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function ListIcon2()    { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function CheckSm()      { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function PendSm()       { return <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>; }
function FlagIcon()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4a1 1 0 0 1 1.5-.87L19 9 5.5 14.87"/></svg>; }
function IdIcon()       { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><line x1="14" y1="10" x2="18" y2="10"/><line x1="14" y1="14" x2="18" y2="14"/></svg>; }
function PhoneIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function MailIcon()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function GradCapIcon()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>; }
function ChevLeftIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevRightIcon(){ return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function ZoomOutIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function ZoomInIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function FitIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 4 20 10 20"/><polyline points="20 10 20 4 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>; }
function ExpandIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>; }
function PrintIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>; }
function MoneyIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function CalendarIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function FlagFinish()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4a1 1 0 0 1 1.5-.87L19 9 5.5 14.87"/><line x1="4" y1="22" x2="4" y2="15"/></svg>; }
function PinIcon()      { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function PaperclipIcon(){ return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>; }
function CertIcon()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.5L17 22l-5-3-5 3 1.5-9.5"/></svg>; }

// =============================================================================
// Compliance · VAP Committee Minutes — bilingual A4 PDF preview
// -----------------------------------------------------------------------------
// SDD §5.3 — on Conclude, the system generates a Minutes PDF circulated to all
// roster members. This page renders that document in the same A4 viewer
// chrome as the existing application-certificate preview, so it can be linked,
// printed and downloaded.
//   /compliance/vap/:meetingId/minutes
// =============================================================================
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getMeeting, VOTE_LABEL, MEETING_STATE_LABEL,
} from '../../services/compliance/vapCommittee';
import { getViolation, formatAed, PERMIT_TYPE_LABEL } from '../../services/compliance/violations';
import { SEVERITY_LABEL, SEVERITY_LABEL_AR } from '../../services/compliance/severity';
import type { VapMeeting, VapAgendaItem } from '../../types';
import { cn } from '../../lib/utils';

export function VapMinutesPreviewPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(100);
  const m = meetingId ? getMeeting(meetingId) : undefined;

  if (!m) {
    return (
      <div className="min-h-screen bg-neutral-25 grid place-items-center">
        <div className="card p-10 text-center max-w-md">
          <div className="font-display font-bold text-[15px] text-ink-950">Meeting not found</div>
          <button onClick={() => navigate('/compliance/vap')} className="mt-4 btn-primary">Back to VAP Committee</button>
        </div>
      </div>
    );
  }

  const fileName = m.minutesFileName ?? `VAP-Minutes-${m.meetingNumber}.pdf`;

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Toolbar — print-hidden */}
      <div className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200 shadow-doe-xs">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/compliance/vap/${m.id}`}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-ink-950 hover:border-action-orange hover:text-action-orange-deep">
              ‹ Back to meeting
            </Link>
            <div className="min-w-0 hidden md:block">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-neutral-500">VAP Committee Minutes · {MEETING_STATE_LABEL[m.state]}</div>
              <div className="text-[12.5px] font-semibold text-ink-950 truncate">
                <span className="font-mono">{m.meetingNumber}</span>
                <span className="text-neutral-300 mx-2">·</span>
                <span>{new Date(m.scheduledAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-md border border-neutral-200 px-1 h-8">
              <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950">−</button>
              <span className="text-[11.5px] font-mono text-ink-950 tabular-nums px-1 min-w-[40px] text-center">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950">+</button>
              <span className="w-px h-4 bg-neutral-200" />
              <button onClick={() => setZoom(100)} className="w-7 h-6 grid place-items-center text-neutral-500 hover:text-ink-950">Fit</button>
            </div>
            <button onClick={() => window.print()}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white text-[12px] font-semibold text-ink-950 hover:border-action-orange hover:text-action-orange-deep">
              Print
            </button>
            <button className="h-8 px-3 rounded-md bg-ink-950 text-white text-[12px] font-semibold hover:opacity-90">
              Download
            </button>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto px-6 pb-3 flex items-center gap-2 text-[11.5px] text-neutral-500">
          <span className="font-mono text-ink-950">{fileName}</span>
          <span className="text-neutral-300">·</span>
          <span>A4 · bilingual</span>
        </div>
      </div>

      {/* Document canvas */}
      <div className="px-6 py-8">
        <div className="flex justify-center">
          <div className="bg-white shadow-doe-lg rounded-sm origin-top transition-transform print:shadow-none print:rounded-none"
            style={{ width: '794px', transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <VapMinutesDocument m={m} />
          </div>
        </div>
      </div>

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
// The bilingual A4 minutes document — matches the existing certificate visual
// language (DoE letterhead · watermark · bilingual labels · QR corner).
// ============================================================================
function VapMinutesDocument({ m }: { m: VapMeeting }) {
  const dt = new Date(m.scheduledAt);
  const dateLabel = dt.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const dateLabelAr = dt.toLocaleDateString('ar-AE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeLabel = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const presentCore = m.roster.filter((r) => r.role !== 'alternate' && m.attendedMemberIds.includes(r.id));
  const presentAlt  = m.roster.filter((r) => r.role === 'alternate' && m.attendedMemberIds.includes(r.id));
  const absent      = m.roster.filter((r) => r.role !== 'alternate' && !m.attendedMemberIds.includes(r.id));

  return (
    <div className="relative overflow-hidden p-10 text-ink-950" style={{ minHeight: '1100px' }}>
      {/* Watermark */}
      <div className="absolute inset-0 pointer-events-none grid place-items-center opacity-[0.06]">
        <div className="font-display font-bold text-ink-950" style={{ fontSize: '78px', transform: 'rotate(-18deg)' }}>
          VAP COMMITTEE
        </div>
      </div>

      <div className="relative">
        {/* Letterhead */}
        <div className="flex items-start justify-between gap-6">
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

        {/* Title */}
        <h2 dir="rtl" className="text-right font-bold text-[13.5px] mt-4">محضر اجتماع لجنة المخالفات والعقوبات</h2>
        <h3 className="font-display font-bold text-[14px] mt-0.5">Violations and Penalties (VAP) Committee — Meeting Minutes</h3>

        {/* Meeting header */}
        <div className="grid grid-cols-2 gap-x-6 mt-4 text-[11px]">
          <Field labelAr="رقم الاجتماع" value={m.meetingNumber} />
          <Field labelAr="نوع الاجتماع" value={m.cadence === 'weekly' ? 'Weekly · أسبوعي' : 'Ad-hoc · استثنائي'} />
          <Field labelAr="تاريخ الاجتماع" value={<span><div>{dateLabel}</div><div dir="rtl" className="text-[10.5px] text-neutral-600 mt-0.5">{dateLabelAr}</div></span>} />
          <Field labelAr="وقت الاجتماع" value={timeLabel} />
          <Field labelAr="مكان الانعقاد" value={m.venue} />
          <Field labelAr="القرار" value={m.decisionRule === 'majority' ? 'Majority · بالأغلبية' : m.decisionRule === 'consensus' ? 'Consensus · بالإجماع' : 'Weighted · بترجيح الأصوات'} />
        </div>

        {/* Attendance */}
        <div className="mt-4">
          <div dir="rtl" className="text-right text-[11px] font-semibold">الحضور</div>
          <div className="text-[10.5px] text-neutral-500 mt-1 mb-2">Attendance</div>
          <div className="grid grid-cols-2 gap-x-6 text-[11px]">
            <div>
              <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">Present ({presentCore.length})</div>
              <ul className="space-y-1">
                {presentCore.map((mem) => (
                  <li key={mem.id} className="flex items-start gap-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>
                    <div>
                      <div className="text-[11px] font-semibold text-ink-950">{mem.name}</div>
                      <div className="text-[10px] text-neutral-500"><span className="capitalize">{mem.role.replace('_', ' ')}</span> · {mem.organisation}</div>
                    </div>
                  </li>
                ))}
                {presentAlt.map((mem) => (
                  <li key={mem.id} className="flex items-start gap-2">
                    <span className="text-info-500 mt-0.5">⊕</span>
                    <div>
                      <div className="text-[11px] font-semibold text-ink-950">{mem.name}</div>
                      <div className="text-[10px] text-neutral-500">Alternate · {mem.organisation}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[10px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">Absent / Apologies ({absent.length})</div>
              <ul className="space-y-1">
                {absent.length === 0 ? (
                  <li className="text-[10.5px] text-neutral-400 italic">None</li>
                ) : absent.map((mem) => (
                  <li key={mem.id} className="flex items-start gap-2">
                    <span className="text-neutral-400 mt-0.5">○</span>
                    <div>
                      <div className="text-[11px] font-semibold text-ink-950">{mem.name}</div>
                      <div className="text-[10px] text-neutral-500"><span className="capitalize">{mem.role.replace('_', ' ')}</span> · {mem.organisation}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-[10px] text-neutral-500">
                <div>Secretary: <span className="font-semibold text-ink-950">{m.secretaryName}</span></div>
                {m.chairName && <div>Chair: <span className="font-semibold text-ink-950">{m.chairName}</span></div>}
                <div>Quorum required: <span className="font-mono">{m.quorumMin}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Agenda items */}
        <div className="mt-5">
          <div dir="rtl" className="text-right text-[11px] font-semibold">بنود جدول الأعمال</div>
          <div className="text-[10.5px] text-neutral-500 mt-1 mb-2">Agenda Items ({m.agenda.length})</div>
          {m.agenda.length === 0 ? (
            <div className="text-[11px] text-neutral-400 italic">No agenda items.</div>
          ) : (
            <div className="space-y-3">
              {m.agenda.map((a) => <AgendaItemMinutes key={a.id} a={a} />)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-[10px]" dir="rtl">
          <div className="font-semibold">ملاحظات:</div>
          <ol className="mt-1.5 space-y-1.5 pr-4 list-decimal">
            <li>يُعدّ هذا المحضر سجلاً رسمياً لقرارات اللجنة، ويتم تعميمه على جميع الأعضاء.</li>
            <li>تُنفّذ قرارات اللجنة بإصدار خطابات الإنذار وإشعارات العقوبات تلقائياً من النظام.</li>
            <li>للمخالفين حق الاعتراض خلال ثلاثين (30) يوماً من تاريخ إشعار العقوبة.</li>
          </ol>
        </div>

        {/* QR */}
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
    </div>
  );
}

function AgendaItemMinutes({ a }: { a: VapAgendaItem }) {
  const v = getViolation(a.violationId);
  if (!v) return null;
  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-6 h-6 rounded-full bg-info-soft text-info-500 grid place-items-center font-display font-bold text-[10px] shrink-0">
          {a.presentationOrder}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-mono text-[10px] text-neutral-500">{v.id}</span>
            <span className={cn('inline-flex items-center px-1.5 h-4 rounded text-[9px] font-semibold uppercase tracking-wide',
              v.severity === 'critical' ? 'bg-rose-50 text-doe-red' :
              v.severity === 'major' ? 'bg-amber-50 text-amber-700' :
              'bg-info-soft text-info-500')}>
              {SEVERITY_LABEL[v.severity]} · {SEVERITY_LABEL_AR[v.severity]}
            </span>
            <span className="text-[9.5px] text-neutral-500">Offence #{v.offenceCount}</span>
            <span className="text-neutral-300">·</span>
            <span className="text-[9.5px] text-neutral-500">{PERMIT_TYPE_LABEL[v.permitType]}</span>
          </div>
          <div className="text-[11.5px] font-bold text-ink-950 leading-tight">{v.title}</div>
          <div className="text-[10px] text-neutral-500 mt-0.5" dir="rtl">{v.titleAr}</div>
          <div className="text-[10.5px] text-neutral-600 mt-1">Licensee: <span className="font-semibold text-ink-950">{v.licensee.name}</span></div>
        </div>
        {a.finalDecision && (
          <span className={cn('inline-flex items-center px-2 h-5 rounded-full text-[9.5px] font-semibold uppercase tracking-wide',
            a.finalDecision === 'penalty_imposed' ? 'bg-doe-red text-white' :
            a.finalDecision === 'warning_letter' ? 'bg-amber-500 text-white' :
            a.finalDecision === 'no_action' ? 'bg-emerald-600 text-white' :
            a.finalDecision === 'referred_investigation' ? 'bg-info-500 text-white' :
            'bg-neutral-300 text-neutral-800')}>
            {VOTE_LABEL[a.finalDecision]}
          </span>
        )}
      </div>

      {/* Discussion summary */}
      {a.discussionSummary && (
        <div className="mt-2 mb-2 text-[10.5px] text-ink-950 italic leading-snug border-l-2 border-neutral-200 pl-2.5">
          "{a.discussionSummary}"
        </div>
      )}

      {/* Per-member votes */}
      {a.votes.length > 0 && (
        <div>
          <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-1">Vote tally</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
            {a.votes.map((vt) => (
              <div key={vt.memberId} className="flex items-center justify-between gap-2">
                <span className="text-ink-950 truncate">{vt.memberName}</span>
                <span className="font-semibold text-neutral-700 whitespace-nowrap">{VOTE_LABEL[vt.vote]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Penalty info */}
      {a.finalDecision === 'penalty_imposed' && v.penaltyAed > 0 && (
        <div className="mt-2 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-[10.5px]">
          <span className="text-neutral-500">Imposed penalty</span>
          <span className="font-mono font-semibold text-doe-red">{formatAed(v.penaltyAed)}</span>
        </div>
      )}
    </div>
  );
}

function Field({ labelAr, value }: { labelAr: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1 border-b border-neutral-200">
      <div className="text-[11px] flex-1 min-w-0 break-words">{value || '-'}</div>
      <div className="text-neutral-400 text-[11px]">:</div>
      <div className="text-[11px] text-neutral-700 text-right" dir="rtl" style={{ width: 150 }}>{labelAr}</div>
    </div>
  );
}

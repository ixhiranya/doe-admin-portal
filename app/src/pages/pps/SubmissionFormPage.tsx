import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { usePpsSubmissions } from '../../store/ppsSubmissions';
import { StatusPill } from '../../components/pps/StatusPill';
import { SuccessModal } from '../../components/pps/SuccessModal';
import { cn, AHMED_ID } from '../../lib/utils';
import { formatDate, formatDateTime } from '../../lib/utils';
import lpgAdnocRaw from '../../data/pps-fields/lpg-adnoc.json';
import { getEntityTemplate, type EntityTemplate, type TemplateSection, type SeasonalCategory, type RegionGroup, type EndUsers, type QualitativeData } from '../../data/pps-fields';
import type { Submission } from '../../types/pps';

// ============================================================================
// SubmissionFormPage — the entity-side editor.
// Layout matches the original Data-Submission design (left sidebar + Validation
// + Activity, right-side form sections, sticky footer). Entity users can save
// drafts and submit to DoE.
//
// FIELD SOURCE: the LPG form's sections + rows are driven by
//   src/data/pps-fields/lpg-adnoc.json
// which is extracted verbatim from the '0. ADNOC D.' tab of
//   Baseline Assessment_Market model_LPG_vF.xlsx.
// Values are reported in thousand tonnes (kt) — the workbook collects volumes
// in liters and converts at 1,763.2 L/t to the kt figures used here.
// ============================================================================

type RefRow = { label: string; kt: (number | null)[]; auto?: boolean };
type RefDoc = {
  product: string;
  company: string;
  inputUnit: string;
  reportingUnit: string;
  litersPerKt: number;
  years: number[];
  sections: {
    no: string;
    title: string;
    rows?: RefRow[];
    subSectors?: string[];
    groups?: { region: string; rows: RefRow[] }[];
    total?: RefRow;
    quarterly?: { label: string; byQuarter: Record<string, number> };
    formRows?: RefRow[];
    seasonalCategories?: SeasonalCategory[];
    regionGroups?: RegionGroup[];
  }[];
};
// Revised reporting period (2019–2026): trim the LPG reference the same way
// getEntityTemplate trims the generic templates — drop 2027–2030 from years and
// every parallel value array, and from the seasonal year map.
import { REPORT_END_YEAR } from '../../data/pps-fields';
function trimLpgRef(doc: RefDoc): RefDoc {
  const oy = doc.years;
  const clamp = <T,>(arr: T[]): T[] => arr.filter((_, i) => Number(oy[i]) <= REPORT_END_YEAR);
  const clampRow = (r: RefRow): RefRow => ({ ...r, kt: clamp(r.kt) });
  const clampQ = (q?: Record<string, number[]>) => q && Object.fromEntries(Object.entries(q).filter(([y]) => Number(y) <= REPORT_END_YEAR));
  return {
    ...doc,
    years: oy.filter((y) => Number(y) <= REPORT_END_YEAR),
    sections: doc.sections.map((s) => ({
      ...s,
      rows: s.rows?.map(clampRow),
      total: s.total ? clampRow(s.total) : undefined,
      formRows: s.formRows?.map(clampRow),
      groups: s.groups?.map((g) => ({ ...g, rows: g.rows.map(clampRow) })),
      regionGroups: s.regionGroups?.map((g) => ({ ...g, segments: g.segments.map((seg) => ({ ...seg, values: clamp(seg.values) })) })),
      seasonalCategories: s.seasonalCategories?.map((c) => ({ ...c, qByYear: clampQ(c.qByYear) as Record<string, number[]> })),
    })),
  };
}
const LPG = trimLpgRef(lpgAdnocRaw as unknown as RefDoc);
const sec = (no: string) => LPG.sections.find((s) => s.no === no)!;

type Section = { id: string; number: string; label: string; subLabel: string; };

const SECTIONS: Section[] = [
  { id: 's1-1', number: '1.1', label: 'Supply by source',   subLabel: 'Production + Imports' },
  { id: 's2-1', number: '2.1', label: 'Demand by region',   subLabel: '3 regions' },
  { id: 's2-2', number: '2.2', label: 'Demand by segment',  subLabel: 'Residential · Commercial · Industrial' },
  { id: 's2-3', number: '2.3', label: 'Segment × region',   subLabel: '9 region-segments' },
  { id: 's2-4', number: '2.4', label: 'Seasonal trends',    subLabel: 'Quarterly · form split' },
];

interface SupplyRow { field: string; values: (number | null)[]; isFormula?: boolean; }
interface RegionRow { region: string; values: (number | null)[]; }
interface SegmentRow { segment: string; values: (number | null)[]; }

// ============================================================================
// Router entry — picks the renderer for this submission's Product + Entity.
// LPG · ADNOC Distribution is the bespoke master template; every other product
// renders generically from its extracted template (identical UI/components).
// ============================================================================
export function SubmissionFormPage() {
  const { id } = useParams<{ id: string }>();
  const sub = usePpsSubmissions((s) => s.getById(id ?? ''));
  const template = sub ? getEntityTemplate(sub.productId) : null;
  // Key by submission id so switching products/drafts remounts the form and
  // re-initialises its per-template state (prevents stale-state mismatches).
  if (sub && template) return <GenericSubmissionForm key={sub.id} sub={sub} template={template} />;
  return <LpgSubmissionForm key={id} />;
}

function LpgSubmissionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const sub = usePpsSubmissions((s) => s.getById(id ?? ''));
  const saveDraft = usePpsSubmissions((s) => s.saveDraft);
  const runTransition = usePpsSubmissions((s) => s.runTransition);

  const [activeSection, setActiveSection] = useState('s2-1');
  const [savedAt, setSavedAt] = useState<string>(new Date().toISOString());
  const [confirmDecl, setConfirmDecl] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOpen, setSubmittedOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // -----------------------------------------------------------------------
  // Form state — seeded from the ADNOC reference sheet (kt).
  // -----------------------------------------------------------------------
  // Clamp to the revised reporting period (2019–2026); seed `sub.years` may still
  // carry the old 2027–2030 columns. The single editable column is 2026.
  const years = (sub?.years ?? LPG.years).filter((y) => y <= REPORT_END_YEAR);
  const forecastFromIdx = Math.max(0, years.indexOf(REPORT_END_YEAR));

  const [supply, setSupply] = useState<SupplyRow[]>(
    sec('1.1').rows!.filter((r) => !r.auto).map((r) => ({ field: r.label, values: [...r.kt] }))
  );
  const [region, setRegion] = useState<RegionRow[]>(
    sec('2.1').rows!.filter((r) => !r.auto).map((r) => ({ region: r.label, values: [...r.kt] }))
  );
  const [segment, setSegment] = useState<SegmentRow[]>(
    sec('2.2').rows!.filter((r) => !r.auto).map((r) => ({ segment: r.label, values: [...r.kt] }))
  );
  const subSectorLabels = sec('2.2').subSectors ?? [];
  const [subSectorVals, setSubSectorVals] = useState<string[]>(subSectorLabels.map(() => ''));

  const [region23, setRegion23] = useState<RegionGroupState[]>(() =>
    (sec('2.3').regionGroups ?? []).map((g) => ({
      region: g.region,
      segments: g.segments.map((seg) => ({ label: seg.label, values: [...seg.values] })),
    })));

  const [seasonal, setSeasonal] = useState<SeasonalCatState[]>(
    (sec('2.4').seasonalCategories ?? []).map((c) => ({
      label: c.label,
      qByYear: Object.fromEntries(Object.entries(c.qByYear).map(([y, arr]) => [y, [...arr]])),
    }))
  );

  // -----------------------------------------------------------------------
  // Computed totals
  // -----------------------------------------------------------------------
  const supplyWithTotal = useMemo(() => {
    const lp = supply[0]?.values ?? [];
    const imp = supply[1]?.values ?? [];
    return [
      supply[0],
      supply[1],
      { field: 'Total supply from your company', isFormula: true, values: years.map((_, i) => {
        const a = lp[i]; const b = imp[i];
        if (a == null && b == null) return null;
        return (a ?? 0) + (b ?? 0);
      }) },
    ];
  }, [supply, years]);

  const regionTotalRow = useMemo(() => years.map((_, i) => {
    const vals = region.map((r) => r.values[i]).filter((v): v is number => v != null);
    return vals.length ? +vals.reduce((s, v) => s + v, 0).toFixed(2) : null;
  }), [region, years]);

  const segmentTotalRow = useMemo(() => years.map((_, i) => {
    const vals = segment.map((r) => r.values[i]).filter((v): v is number => v != null);
    return vals.length ? +vals.reduce((s, v) => s + v, 0).toFixed(2) : null;
  }), [segment, years]);


  // Only the editable current-year (2026) column is validated — historical
  // 2019–2025 values are trusted, pre-populated and read-only.
  const filledMandatory = useMemo(() => {
    let count = 0; let total = 0;
    const tally = (vals: (number | null)[]) => vals.forEach((v, ci) => { if (ci < forecastFromIdx) return; total++; if (v != null) count++; });
    tally(supply[0]?.values ?? []);
    region.forEach((r) => tally(r.values));
    segment.forEach((r) => tally(r.values));
    return { count, total };
  }, [supply, region, segment, forecastFromIdx]);

  // -----------------------------------------------------------------------
  // Ahmed Al Mazrouei (Entity Submitter) only — a live validation model:
  //  • per-section state for the Form Sections stepper (verified / error)
  //  • an ordered list of the missing mandatory cells so the footer message can
  //    jump → scroll → focus → highlight each one in turn.
  // The mandatory set mirrors the enforced submit gate (Local production +
  // Demand-by-region + Demand-by-segment = 84 cells). Recomputes on every edit.
  // -----------------------------------------------------------------------
  const isAhmed = user?.id === AHMED_ID;
  const [validationAttempted, setValidationAttempted] = useState(false);
  const missingCursor = useRef(0);

  const mandatoryCells = useMemo(() => {
    const cells: { sectionId: string; domId: string; filled: boolean }[] = [];
    const editable = (ci: number) => ci >= forecastFromIdx;   // only 2026
    (supply[0]?.values ?? []).forEach((v, ci) => editable(ci) && cells.push({ sectionId: 's1-1', domId: `fld-s1-1-0-${ci}`, filled: v != null }));
    region.forEach((r, ri) => r.values.forEach((v, ci) => editable(ci) && cells.push({ sectionId: 's2-1', domId: `fld-s2-1-${ri}-${ci}`, filled: v != null })));
    segment.forEach((r, ri) => r.values.forEach((v, ci) => editable(ci) && cells.push({ sectionId: 's2-2', domId: `fld-s2-2-${ri}-${ci}`, filled: v != null })));
    return cells;
  }, [supply, region, segment, forecastFromIdx]);
  const missingCells = useMemo(() => mandatoryCells.filter((c) => !c.filled), [mandatoryCells]);
  const missingCount = missingCells.length;

  // Per-section stepper state. The three enforced sections show verified/error;
  // 2.3 / 2.4 (not part of the submit gate) show verified when fully filled,
  // otherwise stay inactive — they never block submission, so no dead-end error.
  const sectionState = useMemo(() => {
    const stateFor = (sid: string) => {
      const cs = mandatoryCells.filter((c) => c.sectionId === sid);
      if (!cs.length) return 'inactive' as const;
      return cs.every((c) => c.filled) ? ('verified' as const) : ('error' as const);
    };
    const r23 = region23.flatMap((g) => g.segments.flatMap((s) => s.values));
    const seas = seasonal.flatMap((c) => Object.values(c.qByYear).flat());
    return {
      's1-1': stateFor('s1-1'),
      's2-1': stateFor('s2-1'),
      's2-2': stateFor('s2-2'),
      's2-3': (r23.length && r23.every((v) => v != null) ? 'verified' : 'inactive') as 'verified' | 'inactive',
      's2-4': (seas.length && seas.every((v) => v != null) ? 'verified' : 'inactive') as 'verified' | 'inactive',
    } as Record<string, 'verified' | 'error' | 'inactive'>;
  }, [mandatoryCells, region23, seasonal]);

  // Jump to the next unresolved mandatory field: open its section, smooth-scroll,
  // focus it, and flash a temporary red error state (inline styles win over the
  // input's focus ring). Cycles through all missing cells on repeated clicks.
  function goToMissingField() {
    if (!missingCells.length) return;
    const idx = missingCursor.current % missingCells.length;
    missingCursor.current = idx + 1;
    const target = missingCells[idx];
    setActiveSection(target.sectionId);
    requestAnimationFrame(() => {
      const el = document.getElementById(target.domId) as HTMLInputElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
      el.style.boxShadow = '0 0 0 2px #DC2626';
      el.style.backgroundColor = '#FEE2E2';
      const clear = () => {
        el.style.boxShadow = '';
        el.style.backgroundColor = '';
        el.removeEventListener('input', clear);
        el.removeEventListener('blur', clear);
      };
      el.addEventListener('input', clear);
      el.addEventListener('blur', clear);
      window.setTimeout(clear, 3000);
    });
  }

  // -----------------------------------------------------------------------
  function scrollToSection(sid: string) {
    setActiveSection(sid);
    sectionRefs.current[sid]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  useEffect(() => {
    const t = setInterval(() => setSavedAt(new Date().toISOString()), 30000);
    return () => clearInterval(t);
  }, []);

  if (!sub) return <div className="p-6">Submission not found.</div>;
  if (!user) return <div className="p-6">Sign in required.</div>;

  const isOverdue = sub.cycleYear === 2025 && sub.status === 'draft';
  const overdueDays = isOverdue ? Math.max(0, Math.floor((Date.now() - new Date('2026-04-30').getTime()) / 86400000)) : 0;

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------
  function handleSaveDraft() {
    saveDraft(sub!.id, {
      sections: [
        { id: '1-1', number: '1.1', title: 'Supply of LPG to the Emirate of Abu Dhabi',
          description: `Annual volumes · ${years[0]}–${years[years.length - 1]} · unit: thousand tonnes (kt)`,
          rows: supplyWithTotal as any },
        { id: '2-1', number: '2.1', title: 'Demand by region',
          description: `Annual volumes · unit: thousand tonnes (kt)`,
          rows: [...region.map((r) => ({ field: r.region, values: r.values })),
                 { field: 'Total demand from your company', isFormula: true, values: regionTotalRow }] as any },
        { id: '2-2', number: '2.2', title: 'Demand by segment',
          description: `Annual volumes · unit: thousand tonnes (kt)`,
          rows: [...segment.map((r) => ({ field: r.segment, values: r.values })),
                 { field: 'Total demand from your company', isFormula: true, values: segmentTotalRow }] as any },
      ],
      draftCompletePct: Math.round((filledMandatory.count / Math.max(1, filledMandatory.total)) * 100),
    });
    setSavedAt(new Date().toISOString());
  }

  function handleSubmit() {
    if (!confirmDecl) { setError('Please confirm the declaration before submitting.'); return; }
    if (filledMandatory.count < filledMandatory.total) {
      // Ahmed: prevent submit, surface an interactive validation link in the
      // footer, and jump straight to the first missing field.
      if (isAhmed) {
        setError(null);
        setValidationAttempted(true);
        missingCursor.current = 0;
        goToMissingField();
        return;
      }
      setError(`${filledMandatory.total - filledMandatory.count} mandatory fields are still empty.`);
      return;
    }
    setSubmitting(true);
    handleSaveDraft();
    // Demo mode (LPG only): allow Submit to DoE from ANY state and replay the
    // full workflow repeatedly. Force a fresh "submitted" record with no state or
    // role checks, resetting the timeline/remarks so Approve / Request More Info /
    // Reject can run again. The signed-in user is unchanged.
    const now = new Date().toISOString();
    const actor = sub!.entityName || 'ADNOC Distribution';
    saveDraft(sub!.id, {
      status: 'submitted',
      submittedOn: now,
      submittedBy: actor,
      version: 'v1',
      workflow: [{ at: now, stage: 'submitted', by: actor }],
      reviewRemarks: [],
    });
    setSubmitting(false);
    setError(null);
    setSubmittedOpen(true);
  }

  const unitMeta = `UNIT · kt · ${years.length} YEAR-COLS · ${years[0]} → ${years[years.length - 1]}`;

  // -----------------------------------------------------------------------
  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-24 bg-neutral-25 min-h-screen">
      {/* ============== HEADER ============== */}
      <nav className="text-[11.5px] text-neutral-500 mb-3 flex items-center gap-1.5 font-sans uppercase tracking-[0.16em]">
        <button onClick={() => navigate(`/pps/submissions?product=${sub.productId}`)} className="hover:text-doe-red">← All submissions</button>
        <span className="text-neutral-300">·</span>
        <span>{sub.status === 'draft' ? 'New submission' : 'Edit submission'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[26px] font-bold text-charcoal-900 leading-tight">{sub.productLabel} · {sub.cycleYear} annual submission</h1>
            <StatusPill status={sub.status} />
            {isOverdue && <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10.5px] font-semibold bg-danger-soft text-danger-500"><span className="w-1.5 h-1.5 rounded-full bg-danger-500" /> {overdueDays} days overdue</span>}
          </div>
          <p className="text-[12.5px] text-neutral-700 mt-1.5 max-w-[820px]">
            {sub.entityName} · {sub.productLabel} producer submission (Bulk &amp; Cylinder). Volumes are reported in <strong>thousand tonnes (kt)</strong>, converted from liters at 1,763.2 L/t. Enter annual figures from <strong>{years[0]} (historical actuals)</strong> through <strong>{years[years.length - 1]} (forecast)</strong> across supply, demand and seasonal sections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><HistoryIcon /> Version history</button>
          {sub.status === 'draft' && (
            <button onClick={() => navigate(`/pps/submissions?product=${sub.productId}`)} className="h-9 px-3.5 rounded-md border border-danger-500/30 bg-white text-danger-500 text-[12.5px] font-semibold hover:bg-danger-soft/30">Discard draft</button>
          )}
        </div>
      </div>

      {/* ============== META BAR ============== */}
      <div className="card grid grid-cols-5 divide-x divide-neutral-100 mb-4">
        <Meta label="Submission ID" value={`${sub.ref}${sub.status === 'draft' ? ' (draft)' : ''}`} mono />
        <Meta label="Entity"        value={sub.entityName} />
        <Meta label="Form template" value={sub.formType} />
        <Meta label={isOverdue ? 'Was due' : 'Due'} value={`30 Apr 2026${overdueDays ? ` · overdue ${overdueDays}d` : ''}`} tone={isOverdue ? 'danger' : undefined} />
        <Meta label="Unit of measure" value="Thousand tonnes (kt)" />
      </div>

      {/* ============== LAYOUT ============== */}
      <div className="grid grid-cols-[240px_1fr] gap-4 items-start">
        {/* ----- SIDEBAR ----- */}
        <div className="space-y-3 sticky top-[120px] max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          <div className="card p-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 px-1 mb-2">Form sections</div>
            <div className="space-y-1">
              {SECTIONS.map((s) => {
                const active = activeSection === s.id;
                const st = sectionState[s.id];
                // Ahmed: badge + indicator are validation-driven. The active section
                // keeps its orange highlight; otherwise verified=green, error=red.
                const badgeCls = isAhmed
                  ? (active ? 'bg-action-orange-deep text-white'
                    : st === 'verified' ? 'bg-success-500 text-white'
                    : st === 'error' ? 'bg-danger-500 text-white'
                    : 'bg-neutral-100 text-neutral-500')
                  : (s.id === 's1-1' ? 'bg-success-500 text-white'
                    : active ? 'bg-action-orange-deep text-white'
                    : 'bg-neutral-100 text-neutral-500');
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={cn('w-full text-left px-2 py-2 rounded-md flex items-center gap-2.5 transition',
                      active ? 'bg-action-orange-soft text-action-orange-deep' : 'hover:bg-neutral-50')}
                  >
                    <span className={cn('w-7 h-6 rounded grid place-items-center font-mono text-[11px] font-bold flex-shrink-0', badgeCls)}>{s.number}</span>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[12px] font-semibold leading-tight', active ? 'text-action-orange-deep' : 'text-ink-950')}>{s.label}</div>
                      <div className="text-[10.5px] text-neutral-500 mt-0.5 leading-tight">{s.subLabel}</div>
                    </div>
                    {isAhmed
                      ? <SectionStatusIcon state={st} />
                      : (s.id === 's1-1' && <CheckIcon className="text-success-500" />)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-3 bg-info-soft/40 border-info-500/20">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-info-500 px-1 mb-2">Validation</div>
            <ul className="space-y-1.5 text-[11.5px]">
              <li className="flex items-center gap-1.5"><DotIcon className="text-success-500" /> Mandatory fields filled · <strong>{filledMandatory.count}/{filledMandatory.total}</strong></li>
              <li className="flex items-center gap-1.5"><DotIcon className="text-success-500" /> All values non-negative</li>
              <li className="flex items-center gap-1.5 text-warning-500"><DotIcon className="text-warning-500" /> 1 variance &gt; 20% vs prior year — review</li>
              <li className="flex items-center gap-1.5"><DotIcon className="text-success-500" /> Region &amp; segment totals reconcile</li>
            </ul>
          </div>

          <div className="card p-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 px-1 mb-1">Activity</div>
            <div className="text-[11.5px] text-ink-950"><strong>Draft saved</strong> · {formatDateTime(savedAt)}</div>
            <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">Auto-save every 30s · {sub.version}</div>
          </div>
        </div>

        {/* ----- FORM SECTIONS ----- */}
        <div className="space-y-3 min-w-0">
          {/* SECTION 1.1 — Supply by source */}
          <SectionCard ref={(el) => { sectionRefs.current['s1-1'] = el; }} number="1.1"
            title="Supply of LPG to the Emirate of Abu Dhabi"
            desc={<>Annual volumes by source. Total supply auto-calculates as <strong>Local production / transfer + Imports</strong>.</>}
            meta={unitMeta}>
            <YearGridTable
              fieldHeader="Field"
              fieldKeyPrefix="fld-s1-1"
              rows={supplyWithTotal.map((r) => ({ label: r!.field, mandatory: !r!.isFormula, isFormula: r!.isFormula, values: r!.values }))}
              years={years} forecastFromIdx={forecastFromIdx}
              onChange={(rowIdx, colIdx, v) => {
                if (rowIdx > 1) return;
                setSupply((prev) => prev.map((r, i) => i === rowIdx ? { ...r, values: r.values.map((x, ci) => ci === colIdx ? v : x) } : r));
              }}
            />
          </SectionCard>

          {/* SECTION 2.1 — Demand by region */}
          <SectionCard ref={(el) => { sectionRefs.current['s2-1'] = el; }} number="2.1"
            title="Demand by region"
            desc={<>Total LPG volumes demanded in each of the three regions of Abu Dhabi. Region totals must reconcile with the region × segment grid in section 2.3.</>}
            meta={unitMeta}>
            <YearGridTable
              fieldHeader="Region"
              fieldKeyPrefix="fld-s2-1"
              rows={[
                ...region.map((r) => ({ label: r.region, mandatory: true, values: r.values })),
                { label: 'Total demand from your company', isFormula: true, values: regionTotalRow },
              ]}
              years={years} forecastFromIdx={forecastFromIdx}
              onChange={(rowIdx, colIdx, v) => {
                if (rowIdx >= region.length) return;
                setRegion((prev) => prev.map((r, i) => i === rowIdx ? { ...r, values: r.values.map((x, ci) => ci === colIdx ? v : x) } : r));
              }}
            />
          </SectionCard>

          {/* SECTION 2.2 — Demand by segment */}
          <SectionCard ref={(el) => { sectionRefs.current['s2-2'] = el; }} number="2.2"
            title="Demand by segment"
            desc={<>Split total LPG demand by end-use segment — <strong>Residential</strong>, <strong>Commercial</strong> and <strong>Industrial</strong>. Use the sub-sector notes to specify the dominant use within each segment.</>}
            meta={unitMeta}>
            <YearGridTable
              fieldHeader="Segment"
              fieldKeyPrefix="fld-s2-2"
              rows={[
                ...segment.map((r) => ({ label: r.segment, mandatory: true, values: r.values })),
                { label: 'Total demand from your company', isFormula: true, values: segmentTotalRow },
              ]}
              years={years} forecastFromIdx={forecastFromIdx}
              onChange={(rowIdx, colIdx, v) => {
                if (rowIdx >= segment.length) return;
                setSegment((prev) => prev.map((r, i) => i === rowIdx ? { ...r, values: r.values.map((x, ci) => ci === colIdx ? v : x) } : r));
              }}
            />
            <SubSectorFields
              labels={subSectorLabels}
              values={subSectorVals}
              onChange={(i, v) => setSubSectorVals((prev) => prev.map((x, ix) => ix === i ? v : x))}
            />
          </SectionCard>

          {/* SECTION 2.3 — Demand by segment and by region */}
          <SectionCard ref={(el) => { sectionRefs.current['s2-3'] = el; }} number="2.3"
            title="Demand by segment and by region"
            desc={<>The region × segment breakdown required by the dashboard. Each region is split into <strong>Residential</strong>, <strong>Commercial</strong> and <strong>Industrial</strong> demand; the total reconciles with sections 2.1 and 2.2.</>}
            meta={unitMeta}>
            <div className="rounded-md border border-warning-500/40 bg-warning-soft/50 p-3 mb-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="text-warning-500 mt-0.5">⚠</span>
                <div className="text-[12px] text-neutral-700"><strong className="text-ink-950">Variance check:</strong> Abu Dhabi City · Commercial 2022 entered at <strong>47.9 kt</strong> — 28% below your 2021 value (66.4 kt). Confirm or revise. Add a note for DoE if intentional.</div>
              </div>
              <button className="text-[11.5px] font-semibold text-action-orange hover:underline whitespace-nowrap">Add note…</button>
            </div>
            <RegionSegmentTable
              groups={region23}
              years={years}
              forecastFromIdx={forecastFromIdx}
              totalLabel="Total demand from your company"
              onChange={(gi, sgi, ci, v) => setRegion23((prev) => prev.map((g, gk) => gk === gi
                ? { ...g, segments: g.segments.map((seg, sk) => sk === sgi ? { ...seg, values: seg.values.map((x, c) => c === ci ? v : x) } : seg) }
                : g))}
            />
          </SectionCard>

          {/* SECTION 2.4 — Seasonal trends */}
          <SectionCard ref={(el) => { sectionRefs.current['s2-4'] = el; }} number="2.4"
            title="Seasonal trends"
            desc={<>Quarterly split (Q1–Q4) across {years[0]}–{years[years.length - 1]} by LPG form — <strong>Cylinder (Reseller)</strong>, <strong>Cylinder (ADNOC End Customer)</strong> and <strong>Bulk</strong>. DoE uses these to compute the seasonal line chart on the dashboard.</>}
            meta={`UNIT · kt · ${years.length} YEAR-COLS · Q1–Q4 · ${years[0]} → ${years[years.length - 1]}`}>
            <SeasonalSection
              categories={seasonal}
              years={years}
              forecastFromIdx={forecastFromIdx}
              onChange={(ci, y, qi, v) => setSeasonal((prev) => prev.map((c, k) => k === ci
                ? { ...c, qByYear: { ...c.qByYear, [String(y)]: (c.qByYear[String(y)] ?? [null, null, null, null]).map((x, qq) => qq === qi ? (v as any) : x) } }
                : c))}
            />
          </SectionCard>

          {/* DECLARATION */}
          <div className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-md bg-ink-950 text-white grid place-items-center text-[14px]">✓</div>
              <div>
                <h3 className="font-display text-[15px] font-bold text-ink-950">Submitter notes &amp; declaration</h3>
                <p className="text-[11.5px] text-neutral-500 mt-0.5">Optional context for the DoE reviewer. A declaration is required at submit.</p>
              </div>
            </div>
            <label className="block text-[11.5px] font-semibold text-ink-950 mb-1">Notes to reviewer <span className="font-normal text-neutral-500">optional</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Explain any large variances, gaps, or context the reviewer should know about…" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
            <div className="text-[10.5px] text-neutral-500 mt-1">Recommended where any value differs by more than 20% from your prior year.</div>
            <label className="flex items-start gap-2 mt-3 text-[12px] text-neutral-700">
              <input type="checkbox" checked={confirmDecl} onChange={(e) => setConfirmDecl(e.target.checked)} className="mt-0.5" />
              <span>I confirm the data submitted is accurate to the best of my knowledge, reconciled with ADNOC Distribution internal records, and complies with DoE Regulation PPS-04. <span className="text-doe-red">*</span></span>
            </label>
          </div>
        </div>
      </div>

      {/* ============== STICKY FOOTER ============== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 shadow-doe-md z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success-500" />
            <span className="text-neutral-700">Draft auto-saved · {formatDateTime(savedAt)} · <strong>{filledMandatory.count}/{filledMandatory.total}</strong> fields complete</span>
            {isAhmed ? (
              <>
                {validationAttempted && missingCount > 0 && (
                  <button
                    onClick={goToMissingField}
                    className="ml-3 inline-flex items-center gap-1 text-danger-500 font-semibold underline decoration-danger-500/40 underline-offset-2 hover:decoration-danger-500"
                  >
                    {missingCount} mandatory field{missingCount > 1 ? 's are' : ' is'} still empty — jump to {missingCount > 1 ? 'next field' : 'field'} →
                  </button>
                )}
                {validationAttempted && missingCount === 0 && (
                  <span className="ml-3 inline-flex items-center gap-1 text-success-500 font-semibold"><CheckIcon /> All mandatory fields complete</span>
                )}
                {error && <span className="text-danger-500 ml-3">{error}</span>}
              </>
            ) : (
              error && <span className="text-danger-500 ml-3">{error}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSaveDraft} className="h-9 px-3.5 rounded-md text-[12.5px] text-neutral-700 hover:bg-neutral-50">Save draft</button>
            <button
              onClick={() => { if (!isAhmed) return; setValidationAttempted(true); if (missingCount > 0) { missingCursor.current = 0; goToMissingField(); } }}
              className="btn-secondary text-[12.5px]"
            ><CheckIcon /> Validate</button>
            <button disabled={submitting} onClick={handleSubmit} className="btn-primary text-[12.5px] disabled:opacity-60">
              Submit to DoE <span className="ml-1">→</span>
            </button>
          </div>
        </div>
      </div>

      <SuccessModal
        open={submittedOpen}
        tone="success"
        title="Submission sent successfully"
        message="Submission successfully sent to DoE for review."
        actionLabel="Done"
        onClose={() => navigate(user?.role === 'pps_entity' ? `/pps/submissions?product=${sub!.productId}` : `/pps/submissions/${sub!.id}`)}
      />
    </div>
  );
}

// ============================================================================
// Helper components
// ============================================================================

import { forwardRef } from 'react';

const SectionCard = forwardRef<HTMLDivElement, { number: string; title: string; desc: React.ReactNode; meta: string; children: React.ReactNode }>(
  function SectionCard({ number, title, desc, meta, children }, ref) {
    return (
      <div ref={ref} className="card p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-md bg-ink-950 text-white grid place-items-center font-mono font-bold text-[12px] flex-shrink-0">{number}</div>
          <div className="flex-1">
            <h3 className="font-display text-[15px] font-bold text-ink-950">{title}</h3>
            <p className="text-[11.5px] text-neutral-500 mt-0.5 leading-relaxed">{desc}</p>
          </div>
          <span className="text-[10.5px] font-sans uppercase tracking-wider text-neutral-500 whitespace-nowrap mt-1">{meta}</span>
        </div>
        {children}
      </div>
    );
  }
);

function YearGridTable({ fieldHeader, rows, years, columns, forecastFromIdx, onChange, readOnly, fieldKeyPrefix }: { fieldHeader: string; rows: { label: string; mandatory?: boolean; isFormula?: boolean; values: (number | null)[] }[]; years?: number[]; columns?: (number | string)[]; forecastFromIdx: number; onChange?: (rowIdx: number, colIdx: number, v: number | null) => void; readOnly?: boolean; fieldKeyPrefix?: string; }) {
  const cols: (number | string)[] = columns ?? years ?? [];
  return (
    <div className="border border-neutral-100 rounded-lg overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
          <tr>
            <th className="text-left px-3 py-2.5 sticky left-0 bg-neutral-50 z-10">{fieldHeader}</th>
            {cols.map((y, i) => (
              <th key={`${y}-${i}`} className={cn('text-right px-3 py-2.5', i >= forecastFromIdx && 'text-action-orange-deep')}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={`${row.label}-${rIdx}`} className="border-t border-neutral-100">
              <td className="px-3 py-1.5 text-ink-950 sticky left-0 bg-white z-10 whitespace-nowrap">
                {row.label} {row.mandatory && <span className="text-doe-red">*</span>}
                {row.isFormula && <span className="ml-1 text-[9.5px] font-sans uppercase tracking-wider text-neutral-400">f auto</span>}
              </td>
              {row.values.map((v, cIdx) => (
                <td key={cIdx} className={cn('px-2 py-1', cIdx >= forecastFromIdx && 'bg-action-orange/5')}>
                  {row.isFormula ? (
                    <div className={cn('text-right font-mono px-2 py-1', cIdx >= forecastFromIdx ? 'text-action-orange-deep' : 'text-neutral-500')}>
                      ƒ {v == null ? '—' : v.toLocaleString()}
                    </div>
                  ) : (readOnly || cIdx < forecastFromIdx) ? (
                    // Historical years (2019–2025) are read-only/pre-populated.
                    <div className={cn('text-right font-mono px-2 py-1 text-[12px]', cIdx >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950', !readOnly && 'bg-neutral-50/60 rounded')}>{v == null ? '—' : v.toLocaleString()}</div>
                  ) : (
                    <input
                      id={fieldKeyPrefix ? `${fieldKeyPrefix}-${rIdx}-${cIdx}` : undefined}
                      type="number"
                      value={v ?? ''}
                      onChange={(e) => onChange?.(rIdx, cIdx, e.target.value === '' ? null : Number(e.target.value))}
                      className={cn('w-[68px] px-1.5 py-1 rounded border border-transparent hover:border-neutral-200 focus:border-action-orange focus:ring-1 focus:ring-action-orange/30 text-right font-mono text-[12px]', cIdx >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950')}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Seasonal table — year-structured (2019→2030 columns) with each category
// spanning Q1–Q4 stacked rows. Mirrors YearGridTable styling exactly, including
// historical/forecast column treatment, so it reads as the same design.
type SeasonalCatState = { label: string; qByYear: Record<string, number[]> };
function SeasonalTable({ categories, years, forecastFromIdx, onChange, readOnly }: {
  categories: SeasonalCatState[];
  years: number[];
  forecastFromIdx: number;
  onChange: (catIdx: number, year: number, qIdx: number, v: number | null) => void;
  readOnly?: boolean;
}) {
  const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
  return (
    <div className="border border-neutral-100 rounded-lg overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
          <tr>
            <th className="text-left px-3 py-2.5 sticky left-0 bg-neutral-50 z-10">Category</th>
            <th className="text-left px-3 py-2.5">Quarter</th>
            {years.map((y, i) => (
              <th key={y} className={cn('text-right px-3 py-2.5', i >= forecastFromIdx && 'text-action-orange-deep')}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, ci) => QUARTERS.map((q, qi) => (
            <tr key={`${ci}-${qi}`} className={cn(qi === 0 ? 'border-t-2 border-neutral-100' : 'border-t border-neutral-50')}>
              {qi === 0 && (
                <td rowSpan={4} className="px-3 py-2 text-ink-950 font-semibold align-top sticky left-0 bg-white z-10 border-r border-neutral-100 whitespace-nowrap">{cat.label}</td>
              )}
              <td className="px-3 py-1.5 text-neutral-700 font-medium">{q}</td>
              {years.map((y, yi) => (
                <td key={y} className={cn('px-2 py-1', yi >= forecastFromIdx && 'bg-action-orange/5')}>
                  {(readOnly || yi < forecastFromIdx) ? (
                    <div className={cn('text-right font-mono px-2 py-1 text-[12px]', yi >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950', !readOnly && 'bg-neutral-50/60 rounded')}>{cat.qByYear[String(y)]?.[qi] == null ? '—' : cat.qByYear[String(y)]![qi]!.toLocaleString()}</div>
                  ) : (
                    <input
                      type="number"
                      value={cat.qByYear[String(y)]?.[qi] ?? ''}
                      onChange={(e) => onChange(ci, y, qi, e.target.value === '' ? null : Number(e.target.value))}
                      className={cn('w-[68px] px-1.5 py-1 rounded border border-transparent hover:border-neutral-200 focus:border-action-orange focus:ring-1 focus:ring-action-orange/30 text-right font-mono text-[12px]', yi >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950')}
                    />
                  )}
                </td>
              ))}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

// Seasonal renderer — branches on category count:
//  • 1 category  → simple Q1–Q4 rows × years grid (standard YearGridTable) with a
//    final auto-calculated total row labelled with the category name.
//  • >1 category → the Category-spanning layout (SeasonalTable).
function SeasonalSection({ categories, years, forecastFromIdx, onChange, readOnly }: {
  categories: SeasonalCatState[];
  years: number[];
  forecastFromIdx: number;
  onChange: (catIdx: number, year: number, qIdx: number, v: number | null) => void;
  readOnly?: boolean;
}) {
  if (categories.length === 1) {
    const cat = categories[0];
    const quarterRows = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, qi) => ({
      label: q,
      mandatory: true,
      values: years.map((y) => cat.qByYear[String(y)]?.[qi] ?? null),
    }));
    const totalRow = {
      label: cat.label,
      isFormula: true,
      values: years.map((y) => {
        const present = (cat.qByYear[String(y)] ?? []).filter((v): v is number => v != null);
        return present.length ? +present.reduce((a, b) => a + b, 0).toFixed(2) : null;
      }),
    };
    return (
      <YearGridTable
        fieldHeader="Quarter"
        columns={years}
        forecastFromIdx={forecastFromIdx}
        rows={[...quarterRows, totalRow]}
        readOnly={readOnly}
        onChange={(ri, ci, v) => { if (ri >= 4) return; onChange(0, years[ci], ri, v); }}
      />
    );
  }
  return <SeasonalTable categories={categories} years={years} forecastFromIdx={forecastFromIdx} onChange={onChange} readOnly={readOnly} />;
}

// Region × segment table — Region is a parent group (rowspan) over its Segment
// rows, then year columns, with one auto-calculated grand-total row. Mirrors the
// other sections' styling (forecast columns, ƒ total).
type RegionGroupState = { region: string; segments: { label: string; values: (number | null)[] }[] };
function RegionSegmentTable({ groups, years, forecastFromIdx, totalLabel, onChange, readOnly }: {
  groups: RegionGroupState[];
  years: number[];
  forecastFromIdx: number;
  totalLabel: string;
  onChange: (groupIdx: number, segIdx: number, colIdx: number, v: number | null) => void;
  readOnly?: boolean;
}) {
  const total = years.map((_, ci) => {
    let sum = 0, any = false;
    groups.forEach((g) => g.segments.forEach((seg) => { const v = seg.values[ci]; if (v != null) { sum += v; any = true; } }));
    return any ? +sum.toFixed(2) : null;
  });
  return (
    <div className="border border-neutral-100 rounded-lg overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
          <tr>
            <th className="text-left px-3 py-2.5 sticky left-0 bg-neutral-50 z-10">Region</th>
            <th className="text-left px-3 py-2.5">Segment</th>
            {years.map((y, i) => (
              <th key={y} className={cn('text-right px-3 py-2.5', i >= forecastFromIdx && 'text-action-orange-deep')}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g, gi) => g.segments.map((seg, si) => (
            <tr key={`${gi}-${si}`} className={cn(si === 0 ? 'border-t-2 border-neutral-100' : 'border-t border-neutral-50')}>
              {si === 0 && (
                <td rowSpan={g.segments.length} className="px-3 py-2 text-ink-950 font-semibold align-top sticky left-0 bg-white z-10 border-r border-neutral-100 whitespace-nowrap">{g.region}</td>
              )}
              <td className="px-3 py-1.5 text-neutral-700 font-medium whitespace-nowrap">{seg.label} <span className="text-doe-red">*</span></td>
              {years.map((y, ci) => (
                <td key={y} className={cn('px-2 py-1', ci >= forecastFromIdx && 'bg-action-orange/5')}>
                  {(readOnly || ci < forecastFromIdx) ? (
                    <div className={cn('text-right font-mono px-2 py-1 text-[12px]', ci >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950', !readOnly && 'bg-neutral-50/60 rounded')}>{seg.values[ci] == null ? '—' : seg.values[ci]!.toLocaleString()}</div>
                  ) : (
                    <input
                      type="number"
                      value={seg.values[ci] ?? ''}
                      onChange={(e) => onChange(gi, si, ci, e.target.value === '' ? null : Number(e.target.value))}
                      className={cn('w-[68px] px-1.5 py-1 rounded border border-transparent hover:border-neutral-200 focus:border-action-orange focus:ring-1 focus:ring-action-orange/30 text-right font-mono text-[12px]', ci >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950')}
                    />
                  )}
                </td>
              ))}
            </tr>
          )))}
          <tr className="border-t border-neutral-100 bg-neutral-25">
            <td colSpan={2} className="px-3 py-2 text-ink-950 sticky left-0 bg-neutral-25 z-10 whitespace-nowrap">{totalLabel} <span className="ml-1 text-[9.5px] font-sans uppercase tracking-wider text-neutral-400">f auto</span></td>
            {total.map((v, ci) => (
              <td key={ci} className={cn('px-2 py-1', ci >= forecastFromIdx && 'bg-action-orange/5')}>
                <div className={cn('text-right font-mono px-2 py-1', ci >= forecastFromIdx ? 'text-action-orange-deep' : 'text-neutral-500')}>ƒ {v == null ? '—' : v.toLocaleString()}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Sales-by-end-users (Diesel 2.5): same single-table layout as the 2.3
// Region | Segment grid — standalone rows (label spanning Region+Segment), then
// Region (rowspan) × Segment region groups, then one auto total. Reuses the
// RegionSegmentTable styling exactly.
type EndUsersState = {
  standalone: { label: string; values: (number | null)[] }[];
  regionGroups: { region: string; segments: { label: string; values: (number | null)[] }[] }[];
};
function EndUsersSection({ data, years, forecastFromIdx, onStandaloneChange, onSegmentChange, readOnly }: {
  data: EndUsersState;
  years: number[];
  forecastFromIdx: number;
  onStandaloneChange: (rowIdx: number, colIdx: number, v: number | null) => void;
  onSegmentChange: (groupIdx: number, segIdx: number, colIdx: number, v: number | null) => void;
  readOnly?: boolean;
}) {
  const total = years.map((_, ci) => {
    let sum = 0, any = false;
    data.regionGroups.forEach((g) => g.segments.forEach((seg) => { const v = seg.values[ci]; if (v != null) { sum += v; any = true; } }));
    return any ? +sum.toFixed(2) : null;
  });
  const inputCell = (v: number | null, ci: number, set: (v: number | null) => void) => (
    <td key={ci} className={cn('px-2 py-1', ci >= forecastFromIdx && 'bg-action-orange/5')}>
      {(readOnly || ci < forecastFromIdx) ? (
        <div className={cn('text-right font-mono px-2 py-1 text-[12px]', ci >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950', !readOnly && 'bg-neutral-50/60 rounded')}>{v == null ? '—' : v.toLocaleString()}</div>
      ) : (
        <input
          type="number"
          value={v ?? ''}
          onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
          className={cn('w-[68px] px-1.5 py-1 rounded border border-transparent hover:border-neutral-200 focus:border-action-orange focus:ring-1 focus:ring-action-orange/30 text-right font-mono text-[12px]', ci >= forecastFromIdx ? 'text-action-orange-deep' : 'text-ink-950')}
        />
      )}
    </td>
  );
  return (
    <div className="border border-neutral-100 rounded-lg overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
          <tr>
            <th className="text-left px-3 py-2.5 sticky left-0 bg-neutral-50 z-10">Region</th>
            <th className="text-left px-3 py-2.5">Segment</th>
            {years.map((y, i) => (
              <th key={y} className={cn('text-right px-3 py-2.5', i >= forecastFromIdx && 'text-action-orange-deep')}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Standalone channels — label spans Region + Segment columns */}
          {data.standalone.map((r, ri) => (
            <tr key={`s-${ri}`} className="border-t border-neutral-100">
              <td colSpan={2} className="px-3 py-2 text-ink-950 font-medium sticky left-0 bg-white z-10 border-r border-neutral-100 whitespace-nowrap">{r.label} <span className="text-doe-red">*</span></td>
              {years.map((_, ci) => inputCell(r.values[ci], ci, (v) => onStandaloneChange(ri, ci, v)))}
            </tr>
          ))}
          {/* Region × Segment grid (Region rowspan) */}
          {data.regionGroups.map((g, gi) => g.segments.map((seg, si) => (
            <tr key={`${gi}-${si}`} className={cn(si === 0 ? 'border-t-2 border-neutral-100' : 'border-t border-neutral-50')}>
              {si === 0 && (
                <td rowSpan={g.segments.length} className="px-3 py-2 text-ink-950 font-semibold align-top sticky left-0 bg-white z-10 border-r border-neutral-100 whitespace-nowrap">{g.region}</td>
              )}
              <td className="px-3 py-1.5 text-neutral-700 font-medium whitespace-nowrap">{seg.label} <span className="text-doe-red">*</span></td>
              {years.map((_, ci) => inputCell(seg.values[ci], ci, (v) => onSegmentChange(gi, si, ci, v)))}
            </tr>
          )))}
          <tr className="border-t border-neutral-100 bg-neutral-25">
            <td colSpan={2} className="px-3 py-2 text-ink-950 sticky left-0 bg-neutral-25 z-10 whitespace-nowrap">Total demand from your company <span className="ml-1 text-[9.5px] font-sans uppercase tracking-wider text-neutral-400">f auto</span></td>
            {total.map((v, ci) => (
              <td key={ci} className={cn('px-2 py-1', ci >= forecastFromIdx && 'bg-action-orange/5')}>
                <div className={cn('text-right font-mono px-2 py-1', ci >= forecastFromIdx ? 'text-action-orange-deep' : 'text-neutral-500')}>ƒ {v == null ? '—' : v.toLocaleString()}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Shared sub-sector fields — the exact LPG design (3-col grid, uppercase
// letter-spaced labels, "← Please specify" placeholder). Used by both the LPG
// master form and the generic forms so they stay visually identical.
function SubSectorFields({ labels, values, onChange, readOnly }: {
  labels: string[];
  values: string[];
  onChange: (index: number, value: string) => void;
  readOnly?: boolean;
}) {
  if (!labels.length) return null;
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
      {labels.map((label, i) => (
        <div key={label}>
          <label className="block text-[10.5px] font-sans uppercase tracking-[0.12em] text-neutral-500 mb-1 whitespace-nowrap">{label}</label>
          {readOnly ? (
            <div className="w-full px-2.5 py-1.5 rounded border border-neutral-200 bg-neutral-25 text-[12px] text-ink-950 min-h-[31px]">{values[i]?.trim() ? values[i] : <span className="text-neutral-400">Not specified</span>}</div>
          ) : (
            <input
              type="text"
              value={values[i] ?? ''}
              onChange={(e) => onChange(i, e.target.value)}
              placeholder="← Please specify"
              className="w-full px-2.5 py-1.5 rounded border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/30"
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// getCompareSections — flat grid-section data (label + per-year values) for ANY
// product, used by the v1↔v2 comparison view. Generic products read from their
// trimmed entity template; LPG reads from its bespoke reference. Only numeric
// grid sections are returned (the comparison diffs annual tables).
// ============================================================================
export interface CompareRow { label: string; isFormula?: boolean; values: (number | null)[]; }
export interface CompareSection { number: string; title: string; rows: CompareRow[]; }

export function getCompareSections(productId: string): { years: number[]; sections: CompareSection[] } {
  const tmpl = getEntityTemplate(productId);
  if (tmpl) {
    const sections = tmpl.sections
      .filter((s) => s.kind === 'grid' && s.rows.length > 0)
      .map((s) => ({
        number: s.no,
        title: stripNo(s.title),
        rows: s.rows.map((r) => ({ label: r.label, isFormula: r.auto, values: [...r.values] })),
      }));
    return { years: tmpl.years, sections };
  }
  // LPG bespoke — sections 1.1 / 2.1 / 2.2 with an auto total row.
  const yrs = LPG.years;
  const mk = (no: string, title: string): CompareSection => {
    const inputs = (sec(no).rows ?? []).filter((r) => !r.auto).map((r) => ({ label: r.label, values: [...r.kt] as (number | null)[] }));
    const total = yrs.map((_, i) => {
      const v = inputs.map((r) => r.values[i]).filter((x): x is number => x != null);
      return v.length ? +v.reduce((a, b) => a + b, 0).toFixed(2) : null;
    });
    return { number: no, title, rows: [...inputs, { label: 'Total from your company', isFormula: true, values: total }] };
  };
  return { years: yrs, sections: [mk('1.1', 'Supply of LPG to the Emirate of Abu Dhabi'), mk('2.1', 'Demand by region'), mk('2.2', 'Demand by segment')] };
}

// ============================================================================
// LpgReadOnlySections — a 1:1 READ-ONLY render of the LPG bespoke Submission
// Form (sections 1.1 → 2.4). Sourced from the SAME lpg-adnoc.json reference and
// the SAME table components the form uses, so the View screen is an exact mirror
// of the form — identical sections, fields, grouping, order, labels, units and
// auto-calculations. Used by the Submission View (Ahmed Al Mazrouei).
// ============================================================================
export function LpgReadOnlySections({ sub }: { sub: Submission }) {
  const years = (sub.years ?? LPG.years).filter((y) => y <= REPORT_END_YEAR);
  const forecastFromIdx = Math.max(0, years.indexOf(REPORT_END_YEAR));
  const unitMeta = `UNIT · kt · ${years.length} YEAR-COLS · ${years[0]} → ${years[years.length - 1]}`;

  // 1.1 Supply by source (+ auto total)
  const supplyBase = sec('1.1').rows!.filter((r) => !r.auto).map((r) => ({ field: r.label, values: [...r.kt] }));
  const lp = supplyBase[0]?.values ?? [];
  const imp = supplyBase[1]?.values ?? [];
  const supplyRows = [
    { label: supplyBase[0]?.field ?? 'Local production / transfer', values: lp },
    { label: supplyBase[1]?.field ?? 'Imports', values: imp },
    { label: 'Total supply from your company', isFormula: true, values: years.map((_, i) => {
      const a = lp[i]; const b = imp[i]; if (a == null && b == null) return null; return +(((a ?? 0) + (b ?? 0)).toFixed(2)); }) },
  ];

  // 2.1 Demand by region (+ auto total)
  const region = sec('2.1').rows!.filter((r) => !r.auto).map((r) => ({ region: r.label, values: [...r.kt] }));
  const regionTotal = years.map((_, i) => { const v = region.map((r) => r.values[i]).filter((x): x is number => x != null); return v.length ? +v.reduce((s, x) => s + x, 0).toFixed(2) : null; });

  // 2.2 Demand by segment (+ auto total) + sub-sectors
  const segment = sec('2.2').rows!.filter((r) => !r.auto).map((r) => ({ segment: r.label, values: [...r.kt] }));
  const segmentTotal = years.map((_, i) => { const v = segment.map((r) => r.values[i]).filter((x): x is number => x != null); return v.length ? +v.reduce((s, x) => s + x, 0).toFixed(2) : null; });
  const subSectorLabels = sec('2.2').subSectors ?? [];

  // 2.3 region × segment grid
  const region23 = (sec('2.3').regionGroups ?? []).map((g) => ({ region: g.region, segments: g.segments.map((s) => ({ label: s.label, values: [...s.values] })) }));
  // 2.4 seasonal categories
  const seasonal = (sec('2.4').seasonalCategories ?? []).map((c) => ({ label: c.label, qByYear: Object.fromEntries(Object.entries(c.qByYear).map(([y, arr]) => [y, [...arr]])) }));

  return (
    <div className="space-y-3 mt-3">
      <SectionCard number="1.1" title="Supply of LPG to the Emirate of Abu Dhabi"
        desc={<>Annual volumes by source. Total supply auto-calculates as <strong>Local production / transfer + Imports</strong>.</>} meta={unitMeta}>
        <YearGridTable fieldHeader="Field" rows={supplyRows} years={years} forecastFromIdx={forecastFromIdx} readOnly />
      </SectionCard>

      <SectionCard number="2.1" title="Demand by region"
        desc={<>Total LPG volumes demanded in each of the three regions of Abu Dhabi. Region totals must reconcile with the region × segment grid in section 2.3.</>} meta={unitMeta}>
        <YearGridTable fieldHeader="Region" rows={[...region.map((r) => ({ label: r.region, values: r.values })), { label: 'Total demand from your company', isFormula: true, values: regionTotal }]} years={years} forecastFromIdx={forecastFromIdx} readOnly />
      </SectionCard>

      <SectionCard number="2.2" title="Demand by segment"
        desc={<>Split total LPG demand by end-use segment — <strong>Residential</strong>, <strong>Commercial</strong> and <strong>Industrial</strong>. Use the sub-sector notes to specify the dominant use within each segment.</>} meta={unitMeta}>
        <YearGridTable fieldHeader="Segment" rows={[...segment.map((r) => ({ label: r.segment, values: r.values })), { label: 'Total demand from your company', isFormula: true, values: segmentTotal }]} years={years} forecastFromIdx={forecastFromIdx} readOnly />
        <SubSectorFields labels={subSectorLabels} values={subSectorLabels.map(() => '')} onChange={() => {}} readOnly />
      </SectionCard>

      <SectionCard number="2.3" title="Demand by segment and by region"
        desc={<>The region × segment breakdown required by the dashboard. Each region is split into <strong>Residential</strong>, <strong>Commercial</strong> and <strong>Industrial</strong> demand; the total reconciles with sections 2.1 and 2.2.</>} meta={unitMeta}>
        <RegionSegmentTable groups={region23} years={years} forecastFromIdx={forecastFromIdx} totalLabel="Total demand from your company" onChange={() => {}} readOnly />
      </SectionCard>

      <SectionCard number="2.4" title="Seasonal trends"
        desc={<>Quarterly split (Q1–Q4) across {years[0]}–{years[years.length - 1]} by LPG form — <strong>Cylinder (Reseller)</strong>, <strong>Cylinder (ADNOC End Customer)</strong> and <strong>Bulk</strong>. DoE uses these to compute the seasonal line chart on the dashboard.</>}
        meta={`UNIT · kt · ${years.length} YEAR-COLS · Q1–Q4 · ${years[0]} → ${years[years.length - 1]}`}>
        <SeasonalSection categories={seasonal} years={years} forecastFromIdx={forecastFromIdx} onChange={() => {}} readOnly />
      </SectionCard>
    </div>
  );
}

// Qualitative (non-numeric) section — either a list of labelled free-text fields
// (e.g. "Key ports": one multiline textarea) or a small label/answer matrix
// (Q&A "Key demand drivers"; Area/Status "Latest technological advancement").
// `values` holds edited input text keyed by field/cell; falls back to template
// defaults. readOnly renders values as static text (used by the View screen).
function QualitativeSection({ data, values, onChange, readOnly }: {
  data: QualitativeData;
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
  readOnly?: boolean;
}) {
  // Extra blank rows appended via "+ Add row" (form only; not needed in the View).
  const [extraRows, setExtraRows] = useState(0);
  if (data.kind === 'fields') {
    return (
      <div className="space-y-3">
        {(data.fields ?? []).map((f, i) => {
          const key = `f${i}`;
          const val = values[key] ?? f.value ?? '';
          return (
            <div key={i}>
              <label className="block text-[10.5px] font-sans uppercase tracking-[0.12em] text-neutral-500 mb-1">{f.label}</label>
              {readOnly ? (
                <div className="w-full px-3 py-2 rounded border border-neutral-200 bg-neutral-25 text-[12.5px] text-ink-950 whitespace-pre-line min-h-[40px]">{val.trim() ? val : <span className="text-neutral-400">Not specified</span>}</div>
              ) : f.multiline ? (
                <textarea value={val} onChange={(e) => onChange(key, e.target.value)} rows={4} placeholder={f.placeholder ?? '← Please specify'} className="w-full px-3 py-2 rounded border border-neutral-200 text-[12.5px] whitespace-pre-line focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/30" />
              ) : (
                <input type="text" value={val} onChange={(e) => onChange(key, e.target.value)} placeholder={f.placeholder ?? '← Please specify'} className="w-full px-2.5 py-1.5 rounded border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/30" />
              )}
            </div>
          );
        })}
      </div>
    );
  }
  const cols = data.columns ?? [];
  const inputCols = data.inputCols ?? cols.map(() => false);
  const colType = (ci: number): 'label' | 'text' | 'select' | 'textarea' =>
    data.colTypes?.[ci] ?? (inputCols[ci] ? 'text' : 'label');
  const colWidths = data.colWidths;
  const baseRows = data.rows ?? [];
  const rowCount = baseRows.length + (readOnly ? 0 : extraRows);
  return (
    <div>
      <div className="border border-neutral-100 rounded-lg overflow-x-auto">
        <table className={cn('w-full text-[12.5px]', colWidths && 'table-fixed')}>
          {colWidths && (
            <colgroup>{cols.map((_, ci) => <col key={ci} style={colWidths[ci] ? { width: colWidths[ci]! } : undefined} />)}</colgroup>
          )}
          <thead className="bg-neutral-50 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500">
            <tr>{cols.map((c, ci) => <th key={ci} className="text-left px-3 py-2.5 whitespace-nowrap">{c}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, ri) => {
              const cells = baseRows[ri]?.cells ?? [];
              return (
                <tr key={ri} className="border-t border-neutral-100 align-top">
                  {cols.map((_, ci) => {
                    const cell = cells[ci] ?? '';
                    const type = colType(ci);
                    if (type === 'label') return <td key={ci} className="px-3 py-2.5 text-ink-950 font-medium max-w-[420px]">{cell}</td>;
                    const key = `r${ri}c${ci}`;
                    const val = values[key] ?? cell ?? '';
                    const placeholder = data.colPlaceholders?.[ci] ?? '← Please specify';
                    return (
                      <td key={ci} className="px-3 py-2">
                        {readOnly ? (
                          <div className={cn('w-full px-2.5 py-1.5 rounded border border-neutral-200 bg-neutral-25 text-[12px] text-ink-950 min-h-[31px]', type === 'textarea' && 'whitespace-pre-line')}>{val.trim() ? val : <span className="text-neutral-400">Not specified</span>}</div>
                        ) : type === 'select' ? (
                          <select value={val} onChange={(e) => onChange(key, e.target.value)} className={cn('w-full h-8 px-2.5 py-1.5 rounded border border-neutral-200 text-[12px] bg-white focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/30', !val && 'text-neutral-400')}>
                            <option value="">Select…</option>
                            {(data.colOptions?.[ci] ?? []).map((opt) => <option key={opt} value={opt} className="text-ink-950">{opt}</option>)}
                          </select>
                        ) : type === 'textarea' ? (
                          <textarea value={val} onChange={(e) => onChange(key, e.target.value)} rows={3} placeholder={placeholder} className="w-full px-2.5 py-1.5 rounded border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/30" />
                        ) : (
                          <input type="text" value={val} onChange={(e) => onChange(key, e.target.value)} placeholder={placeholder} className="w-full h-8 px-2.5 py-1.5 rounded border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/30" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.addable && !readOnly && (
        <button type="button" onClick={() => setExtraRows((n) => n + 1)} className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-neutral-200 text-[12px] font-semibold text-ink-950 hover:bg-neutral-50">
          <span className="text-[15px] leading-none">+</span> {data.addLabel ?? 'Add row'}
        </button>
      )}
    </div>
  );
}

function Meta({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'danger' }) {
  return (
    <div className="px-5 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className={cn('text-[13px] mt-0.5', tone === 'danger' ? 'text-danger-500 font-semibold' : 'text-ink-950', mono && 'font-mono')}>{value}</div>
    </div>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>;
}
function DotIcon({ className = '' }: { className?: string }) {
  return <svg width="10" height="10" viewBox="0 0 10 10" className={className}><circle cx="5" cy="5" r="3" fill="currentColor" /></svg>;
}
function HistoryIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>;
}

// Ahmed-only Form Sections stepper indicator: verified (shield-check, green) /
// error (alert-circle, red) / inactive (nothing).
function SectionStatusIcon({ state }: { state: 'verified' | 'error' | 'inactive' }) {
  if (state === 'verified') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success-500 flex-shrink-0" aria-label="Verified">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    );
  }
  if (state === 'error') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger-500 flex-shrink-0" aria-label="Validation error">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return null;
}

// ============================================================================
// GenericSubmissionForm — renders ANY Product+Entity template using the exact
// same chrome and components as the LPG master (sidebar + meta bar + year-grid
// tables + sticky footer). Content/sections/fields/units come from the template.
// ============================================================================

function stripNo(title: string): string {
  return title.replace(/^\d+(\.\d+)*[.)]?\s+/, '');
}

function GenericSubmissionForm({ sub, template }: { sub: Submission; template: EntityTemplate }) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const saveDraft = usePpsSubmissions((s) => s.saveDraft);

  const sections = template.sections;
  const years = template.years;
  const unit = template.reportingUnit.replace(/\*+$/, '').trim() || 'Value';

  const [activeSection, setActiveSection] = useState(sections[0]?.no ?? '');
  const [savedAt, setSavedAt] = useState<string>(new Date().toISOString());
  const [confirmDecl, setConfirmDecl] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOpen, setSubmittedOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Editable values per section/row, plus sub-sector free-text.
  const [data, setData] = useState(() => sections.map((s) => ({
    rows: s.rows.map((r) => [...r.values]),
    subSectors: (s.subSectors ?? []).map((_, i) => s.subSectorValues?.[i] ?? ''),
  })));

  // Seasonal sections: editable Category × Q1-Q4 × year matrix.
  const [seasonalData, setSeasonalData] = useState<(SeasonalCatState[] | null)[]>(() =>
    sections.map((s) => s.kind === 'seasonal' && s.seasonalCategories
      ? s.seasonalCategories.map((c) => ({
          label: c.label,
          qByYear: Object.fromEntries(Object.entries(c.qByYear).map(([y, arr]) => [y, [...arr]])),
        }))
      : null));

  // Region × segment sections: editable region-grouped matrix.
  const [regionData, setRegionData] = useState<(RegionGroupState[] | null)[]>(() =>
    sections.map((s) => s.regionGroups
      ? s.regionGroups.map((g) => ({ region: g.region, segments: g.segments.map((seg) => ({ label: seg.label, values: [...seg.values] })) }))
      : null));

  // Sales-by-end-users sections (Diesel 2.5): standalone rows + region/segment grid.
  const [endUserData, setEndUserData] = useState<(EndUsersState | null)[]>(() =>
    sections.map((s) => s.endUsers
      ? {
          standalone: s.endUsers.standalone.map((r) => ({ label: r.label, values: [...r.values] })),
          regionGroups: s.endUsers.regionGroups.map((g) => ({ region: g.region, segments: g.segments.map((seg) => ({ label: seg.label, values: [...seg.values] })) })),
        }
      : null));

  // Qualitative sections (key ports / demand drivers / latest tech): edited
  // free-text keyed by field/cell. Empty map → component shows template defaults.
  const [qualData, setQualData] = useState<Record<string, string>[]>(() => sections.map(() => ({})));

  // Auto/total rows recompute as the column-sum of the section's input rows.
  const computed = useMemo(() => sections.map((s, si) =>
    s.rows.map((r) => {
      if (!r.auto) return null;
      return s.columns.map((_, ci) => {
        let sum = 0, any = false;
        s.rows.forEach((rr, rri) => {
          if (rr.auto) return;
          const v = data[si].rows[rri]?.[ci];
          if (v != null) { sum += v; any = true; }
        });
        return any ? +sum.toFixed(2) : null;
      });
    })
  ), [data, sections]);

  // Only the editable current-year (2026) column is validated; historical
  // 2019–2025 values are trusted, pre-populated and read-only.
  const filled = useMemo(() => {
    let count = 0, total = 0;
    const ed = (si: number) => sections[si]?.forecastFromIdx ?? 0;
    sections.forEach((s, si) => s.rows.forEach((r, ri) => {
      if (r.auto) return;
      (data[si].rows[ri] ?? []).forEach((v, ci) => { if (ci < ed(si)) return; total++; if (v != null) count++; });
    }));
    regionData.forEach((rg, si) => rg?.forEach((g) => g.segments.forEach((seg) => seg.values.forEach((v, ci) => { if (ci < ed(si)) return; total++; if (v != null) count++; }))));
    endUserData.forEach((eu, si) => eu && (
      eu.standalone.forEach((r) => r.values.forEach((v, ci) => { if (ci < ed(si)) return; total++; if (v != null) count++; })),
      eu.regionGroups.forEach((g) => g.segments.forEach((seg) => seg.values.forEach((v, ci) => { if (ci < ed(si)) return; total++; if (v != null) count++; })))
    ));
    return { count, total };
  }, [data, sections, regionData, endUserData]);

  // -----------------------------------------------------------------------
  // Ahmed Al Mazrouei — the SAME live validation experience as the LPG master,
  // applied to every product's generic form: per-section verified/error icons,
  // an actionable footer link that jumps → scrolls → focuses → flashes each
  // missing mandatory field, and real-time updates. The mandatory set mirrors
  // the submit gate (year-grid inputs + region×segment + end-user grids).
  // -----------------------------------------------------------------------
  const isAhmed = user?.id === AHMED_ID;
  const [validationAttempted, setValidationAttempted] = useState(false);
  const missingCursor = useRef(0);

  const mandatoryCells = useMemo(() => {
    const cells: { sectionNo: string; domId?: string; filled: boolean }[] = [];
    const ed = (si: number) => sections[si]?.forecastFromIdx ?? 0;   // editable col (2026)
    sections.forEach((s, si) => s.rows.forEach((r, ri) => {
      if (r.auto) return;
      (data[si].rows[ri] ?? []).forEach((v, ci) => { if (ci >= ed(si)) cells.push({ sectionNo: s.no, domId: `gfld-${si}-${ri}-${ci}`, filled: v != null }); });
    }));
    regionData.forEach((rg, si) => rg?.forEach((g) => g.segments.forEach((seg) => seg.values.forEach((v, ci) => { if (ci >= ed(si)) cells.push({ sectionNo: sections[si].no, filled: v != null }); }))));
    endUserData.forEach((eu, si) => { if (!eu) return;
      eu.standalone.forEach((r) => r.values.forEach((v, ci) => { if (ci >= ed(si)) cells.push({ sectionNo: sections[si].no, filled: v != null }); }));
      eu.regionGroups.forEach((g) => g.segments.forEach((seg) => seg.values.forEach((v, ci) => { if (ci >= ed(si)) cells.push({ sectionNo: sections[si].no, filled: v != null }); })));
    });
    return cells;
  }, [data, sections, regionData, endUserData]);
  const missingCells = useMemo(() => mandatoryCells.filter((c) => !c.filled), [mandatoryCells]);
  const missingCount = missingCells.length;

  const sectionState = useMemo(() => {
    const m: Record<string, 'verified' | 'error' | 'inactive'> = {};
    sections.forEach((s) => {
      const cs = mandatoryCells.filter((c) => c.sectionNo === s.no);
      m[s.no] = cs.length === 0 ? 'inactive' : cs.every((c) => c.filled) ? 'verified' : 'error';
    });
    return m;
  }, [mandatoryCells, sections]);

  function goToMissingField() {
    if (!missingCells.length) return;
    const idx = missingCursor.current % missingCells.length;
    missingCursor.current = idx + 1;
    const target = missingCells[idx];
    setActiveSection(target.sectionNo);
    requestAnimationFrame(() => {
      const el = target.domId ? (document.getElementById(target.domId) as HTMLInputElement | null) : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus({ preventScroll: true });
        el.style.boxShadow = '0 0 0 2px #DC2626';
        el.style.backgroundColor = '#FEE2E2';
        const clear = () => { el.style.boxShadow = ''; el.style.backgroundColor = ''; el.removeEventListener('input', clear); el.removeEventListener('blur', clear); };
        el.addEventListener('input', clear);
        el.addEventListener('blur', clear);
        window.setTimeout(clear, 3000);
      } else {
        // Region / end-user grids: scroll to the section and flash it.
        const sec = sectionRefs.current[target.sectionNo];
        if (sec) { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); sec.style.boxShadow = '0 0 0 2px #DC2626'; window.setTimeout(() => { sec.style.boxShadow = ''; }, 1800); }
      }
    });
  }

  useEffect(() => {
    const t = setInterval(() => setSavedAt(new Date().toISOString()), 30000);
    return () => clearInterval(t);
  }, []);

  function scrollToSection(no: string) {
    setActiveSection(no);
    sectionRefs.current[no]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!user) return <div className="p-6">Sign in required.</div>;

  const isOverdue = sub.cycleYear === 2025 && sub.status === 'draft';
  const overdueDays = isOverdue ? Math.max(0, Math.floor((Date.now() - new Date('2026-04-30').getTime()) / 86400000)) : 0;

  // Snapshot the entity's template + entered values into SubmissionSection[]
  // so the read-only View screen renders the actual submitted fields/values.
  function buildViewSections() {
    const out: { id: string; number: string; title: string; description?: string; rows: { field: string; values: (number | null)[]; isFormula?: boolean }[] }[] = [];
    sections.forEach((s, si) => {
      if (s.endUsers && endUserData[si]) {
        const eu = endUserData[si]!;
        const rows: { field: string; values: (number | null)[]; isFormula?: boolean }[] =
          eu.standalone.map((r) => ({ field: r.label, values: [...r.values] }));
        eu.regionGroups.forEach((g) => g.segments.forEach((seg) => rows.push({ field: `${g.region} · ${seg.label}`, values: [...seg.values] })));
        rows.push({
          field: 'Total demand from your company', isFormula: true,
          values: years.map((_, ci) => {
            let sum = 0, any = false;
            eu.regionGroups.forEach((g) => g.segments.forEach((seg) => { const v = seg.values[ci]; if (v != null) { sum += v; any = true; } }));
            return any ? +sum.toFixed(2) : null;
          }),
        });
        out.push({ id: s.no, number: s.no, title: stripNo(s.title), description: `Reported in ${unit}`, rows });
      } else if (s.regionGroups && regionData[si]) {
        const rg = regionData[si]!;
        const rows: { field: string; values: (number | null)[]; isFormula?: boolean }[] = [];
        rg.forEach((g) => g.segments.forEach((seg) => rows.push({ field: `${g.region} · ${seg.label}`, values: [...seg.values] })));
        rows.push({
          field: 'Total demand from your company', isFormula: true,
          values: years.map((_, ci) => {
            let sum = 0, any = false;
            rg.forEach((g) => g.segments.forEach((seg) => { const v = seg.values[ci]; if (v != null) { sum += v; any = true; } }));
            return any ? +sum.toFixed(2) : null;
          }),
        });
        out.push({ id: s.no, number: s.no, title: stripNo(s.title), description: `Reported in ${unit}`, rows });
      } else if (s.kind === 'seasonal' && seasonalData[si]) {
        seasonalData[si]!.forEach((cat, ci) => {
          const rows = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, qi) => ({
            field: seasonalData[si]!.length > 1 ? `${cat.label} · ${q}` : q,
            values: years.map((y) => cat.qByYear[String(y)]?.[qi] ?? null),
          }));
          rows.push({
            field: cat.label, isFormula: true,
            values: years.map((y) => {
              const a = (cat.qByYear[String(y)] ?? []).filter((v): v is number => v != null);
              return a.length ? +a.reduce((x, b) => x + b, 0).toFixed(2) : null;
            }),
          } as any);
          out.push({ id: `${s.no}-${ci}`, number: s.no, title: `${stripNo(s.title)}${seasonalData[si]!.length > 1 ? ` · ${cat.label}` : ''}`, description: `Quarterly · reported in ${unit}`, rows });
        });
      } else {
        out.push({
          id: s.no, number: s.no, title: stripNo(s.title),
          description: `Reported in ${unit}`,
          rows: s.rows.map((r, ri) => ({ field: r.label, values: (r.auto ? computed[si][ri] : data[si].rows[ri]) ?? [], isFormula: r.auto })),
        });
      }
    });
    return out;
  }

  function handleSaveDraft() {
    saveDraft(sub.id, {
      sections: buildViewSections() as any,
      draftCompletePct: Math.round((filled.count / Math.max(1, filled.total)) * 100),
    });
    setSavedAt(new Date().toISOString());
  }

  function handleSubmit() {
    if (!confirmDecl) { setError('Please confirm the declaration before submitting.'); return; }
    if (filled.count < filled.total) {
      if (isAhmed) {
        setError(null);
        setValidationAttempted(true);
        missingCursor.current = 0;
        goToMissingField();
        return;
      }
      setError(`${filled.total - filled.count} mandatory fields are still empty.`);
      return;
    }
    setSubmitting(true);
    handleSaveDraft();
    // Demo mode (all 12 products, mirrors the LPG master): allow Submit to DoE
    // from ANY state with no state/role checks, so there is never a "Cannot
    // Submit from state X" block. Force a fresh "submitted" record — Draft →
    // Submitted — that queues to the DoE approver's All-submissions review queue.
    const now = new Date().toISOString();
    const actor = sub.entityName || user!.name;
    saveDraft(sub.id, {
      status: 'submitted',
      submittedOn: now,
      submittedBy: actor,
      version: 'v1',
      workflow: [{ at: now, stage: 'submitted', by: actor }],
      reviewRemarks: [],
    });
    setSubmitting(false);
    setError(null);
    setSubmittedOpen(true);
  }

  const sectionMeta = (s: TemplateSection) =>
    s.kind === 'qualitative'
      ? 'QUALITATIVE · FREE TEXT'
      : s.kind === 'seasonal'
      ? `UNIT · ${unit} · ${years.length} YEAR-COLS · Q1–Q4 · ${years[0]} → ${years[years.length - 1]}`
      : `UNIT · ${unit} · ${s.columns.length} YEAR-COLS · ${years[0]} → ${years[years.length - 1]}`;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-24 bg-neutral-25 min-h-screen">
      {/* ============== HEADER ============== */}
      <nav className="text-[11.5px] text-neutral-500 mb-3 flex items-center gap-1.5 font-sans uppercase tracking-[0.16em]">
        <button onClick={() => navigate(`/pps/submissions?product=${sub.productId}`)} className="hover:text-doe-red">← All submissions</button>
        <span className="text-neutral-300">·</span>
        <span>{sub.status === 'draft' ? 'New submission' : 'Edit submission'}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-[26px] font-bold text-charcoal-900 leading-tight">{sub.productLabel} · {sub.cycleYear} annual submission</h1>
            <StatusPill status={sub.status} />
            {isOverdue && <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[10.5px] font-semibold bg-danger-soft text-danger-500"><span className="w-1.5 h-1.5 rounded-full bg-danger-500" /> {overdueDays} days overdue</span>}
          </div>
          <p className="text-[12.5px] text-neutral-700 mt-1.5 max-w-[820px]">
            {sub.entityName} · {sub.productLabel} {template.formType.toLowerCase()} submission. Volumes are reported in <strong>{unit}</strong>. Enter annual figures from <strong>{years[0]} (historical actuals)</strong> through <strong>{years[years.length - 1]} (forecast)</strong> across the sections below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary"><HistoryIcon /> Version history</button>
          {sub.status === 'draft' && (
            <button onClick={() => navigate(`/pps/submissions?product=${sub.productId}`)} className="h-9 px-3.5 rounded-md border border-danger-500/30 bg-white text-danger-500 text-[12.5px] font-semibold hover:bg-danger-soft/30">Discard draft</button>
          )}
        </div>
      </div>

      {/* ============== META BAR ============== */}
      <div className="card grid grid-cols-5 divide-x divide-neutral-100 mb-4">
        <Meta label="Submission ID" value={`${sub.ref}${sub.status === 'draft' ? ' (draft)' : ''}`} mono />
        <Meta label="Entity"        value={sub.entityName} />
        <Meta label="Form template" value={sub.formType} />
        <Meta label={isOverdue ? 'Was due' : 'Due'} value={`30 Apr 2026${overdueDays ? ` · overdue ${overdueDays}d` : ''}`} tone={isOverdue ? 'danger' : undefined} />
        <Meta label="Unit of measure" value={unit} />
      </div>

      {/* ============== LAYOUT ============== */}
      <div className="grid grid-cols-[240px_1fr] gap-4 items-start">
        {/* ----- SIDEBAR ----- */}
        <div className="space-y-3 sticky top-[120px] max-h-[calc(100vh-140px)] overflow-y-auto pr-1">
          <div className="card p-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 px-1 mb-2">Form sections</div>
            <div className="space-y-1">
              {sections.map((s, i) => {
                const active = activeSection === s.no;
                const st = sectionState[s.no];
                const badgeCls = isAhmed
                  ? (active ? 'bg-action-orange-deep text-white'
                    : st === 'verified' ? 'bg-success-500 text-white'
                    : st === 'error' ? 'bg-danger-500 text-white'
                    : 'bg-neutral-100 text-neutral-500')
                  : (i === 0 ? 'bg-success-500 text-white'
                    : active ? 'bg-action-orange-deep text-white'
                    : 'bg-neutral-100 text-neutral-500');
                return (
                  <button
                    key={`${s.no}-${i}`}
                    onClick={() => scrollToSection(s.no)}
                    className={cn('w-full text-left px-2 py-2 rounded-md flex items-center gap-2.5 transition',
                      active ? 'bg-action-orange-soft text-action-orange-deep' : 'hover:bg-neutral-50')}
                  >
                    <span className={cn('w-7 h-6 rounded grid place-items-center font-mono text-[11px] font-bold flex-shrink-0', badgeCls)}>{s.no}</span>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[12px] font-semibold leading-tight truncate', active ? 'text-action-orange-deep' : 'text-ink-950')}>{stripNo(s.title)}</div>
                      <div className="text-[10.5px] text-neutral-500 mt-0.5 leading-tight">{s.kind === 'qualitative' ? (s.qualitative?.kind === 'fields' ? `${s.qualitative.fields?.length ?? 0} field${(s.qualitative.fields?.length ?? 0) === 1 ? '' : 's'}` : `${s.qualitative?.rows?.length ?? 0} rows`) : s.kind === 'seasonal' ? `${s.columns.length} quarters` : s.endUsers ? `${s.endUsers.standalone.length + s.endUsers.regionGroups.reduce((n, g) => n + g.segments.length, 0)} inputs` : s.regionGroups ? `${s.regionGroups.length} regions` : s.subSectors && s.rows.length === 0 ? `${s.subSectors.length} fields` : `${s.rows.filter((r) => !r.auto).length} inputs`}</div>
                    </div>
                    {isAhmed ? <SectionStatusIcon state={st} /> : (i === 0 && <CheckIcon className="text-success-500" />)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card p-3 bg-info-soft/40 border-info-500/20">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-info-500 px-1 mb-2">Validation</div>
            <ul className="space-y-1.5 text-[11.5px]">
              <li className="flex items-center gap-1.5"><DotIcon className="text-success-500" /> Mandatory fields filled · <strong>{filled.count}/{filled.total}</strong></li>
              <li className="flex items-center gap-1.5"><DotIcon className="text-success-500" /> All values non-negative</li>
              <li className="flex items-center gap-1.5"><DotIcon className="text-success-500" /> {sections.length} sections · totals reconcile</li>
            </ul>
          </div>

          <div className="card p-3">
            <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 px-1 mb-1">Activity</div>
            <div className="text-[11.5px] text-ink-950"><strong>Draft saved</strong> · {formatDateTime(savedAt)}</div>
            <div className="text-[10.5px] font-mono text-neutral-500 mt-0.5">Auto-save every 30s · {sub.version}</div>
          </div>
        </div>

        {/* ----- FORM SECTIONS ----- */}
        <div className="space-y-3 min-w-0">
          {sections.map((s, si) => (
            <SectionCard
              key={`${s.no}-${si}`}
              ref={(el) => { sectionRefs.current[s.no] = el; }}
              number={s.no}
              title={stripNo(s.title)}
              desc={s.description
                ? <>{s.description}</>
                : s.kind === 'qualitative'
                ? <>Qualitative input — provide the requested details for the emirate of Abu Dhabi.</>
                : s.kind === 'seasonal'
                ? <>Quarterly split (Q1–Q4) across {years[0]}–{years[years.length - 1]}. Reported in <strong>{unit}</strong>.</>
                : <>Annual volumes {years[0]}–{years[years.length - 1]}. Reported in <strong>{unit}</strong>. Total rows auto-calculate.</>}
              meta={sectionMeta(s)}>
              {s.kind === 'qualitative' && s.qualitative ? (
                <QualitativeSection
                  data={s.qualitative}
                  values={qualData[si] ?? {}}
                  onChange={(key, v) => setQualData((prev) => prev.map((q, j) => j === si ? { ...q, [key]: v } : q))}
                />
              ) : s.endUsers && endUserData[si] ? (
                <EndUsersSection
                  data={endUserData[si]!}
                  years={years}
                  forecastFromIdx={s.forecastFromIdx}
                  onStandaloneChange={(ri, ci, v) => setEndUserData((prev) => prev.map((eu, j) => j === si && eu
                    ? { ...eu, standalone: eu.standalone.map((r, k) => k === ri ? { ...r, values: r.values.map((x, c) => c === ci ? v : x) } : r) }
                    : eu))}
                  onSegmentChange={(gi, sgi, ci, v) => setEndUserData((prev) => prev.map((eu, j) => j === si && eu
                    ? { ...eu, regionGroups: eu.regionGroups.map((g, k) => k === gi
                        ? { ...g, segments: g.segments.map((seg, m) => m === sgi ? { ...seg, values: seg.values.map((x, c) => c === ci ? v : x) } : seg) }
                        : g) }
                    : eu))}
                />
              ) : s.regionGroups && regionData[si] ? (
                <RegionSegmentTable
                  groups={regionData[si]!}
                  years={years}
                  forecastFromIdx={s.forecastFromIdx}
                  totalLabel={s.totalLabel ?? 'Total demand from your company'}
                  onChange={(gi, sgi, ci, v) => setRegionData((prev) => prev.map((rg, j) => j === si && rg
                    ? rg.map((g, gk) => gk === gi
                        ? { ...g, segments: g.segments.map((seg, sk) => sk === sgi ? { ...seg, values: seg.values.map((x, c) => c === ci ? v : x) } : seg) }
                        : g)
                    : rg))}
                />
              ) : s.kind === 'seasonal' && seasonalData[si] ? (
                <SeasonalSection
                  categories={seasonalData[si]!}
                  years={years}
                  forecastFromIdx={s.forecastFromIdx}
                  onChange={(ci, y, qi, v) => setSeasonalData((prev) => prev.map((sd, j) => j === si && sd
                    ? sd.map((c, k) => k === ci
                        ? { ...c, qByYear: { ...c.qByYear, [String(y)]: (c.qByYear[String(y)] ?? [null, null, null, null]).map((x, qq) => qq === qi ? (v as any) : x) } }
                        : c)
                    : sd))}
                />
              ) : s.rows.length > 0 ? (
              <YearGridTable
                fieldHeader="Field"
                fieldKeyPrefix={isAhmed ? `gfld-${si}` : undefined}
                columns={s.columns}
                forecastFromIdx={s.forecastFromIdx}
                rows={s.rows.map((r, ri) => ({
                  label: r.label,
                  mandatory: r.mandatory && !r.auto,
                  isFormula: r.auto,
                  values: r.auto ? (computed[si][ri] ?? []) : (data[si].rows[ri] ?? []),
                }))}
                onChange={(ri, ci, v) => {
                  if (s.rows[ri].auto) return;
                  setData((prev) => prev.map((sd, j) => j === si
                    ? { ...sd, rows: sd.rows.map((rv, k) => k === ri ? rv.map((x, c) => c === ci ? v : x) : rv) }
                    : sd));
                }}
              />
              ) : null}
              <SubSectorFields
                labels={s.subSectors ?? []}
                values={data[si].subSectors}
                onChange={(i, v) => setData((prev) => prev.map((sd, j) => j === si
                  ? { ...sd, subSectors: sd.subSectors.map((x, ix) => ix === i ? v : x) }
                  : sd))}
              />
            </SectionCard>
          ))}

          {/* DECLARATION */}
          <div className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-md bg-ink-950 text-white grid place-items-center text-[14px]">✓</div>
              <div>
                <h3 className="font-display text-[15px] font-bold text-ink-950">Submitter notes &amp; declaration</h3>
                <p className="text-[11.5px] text-neutral-500 mt-0.5">Optional context for the DoE reviewer. A declaration is required at submit.</p>
              </div>
            </div>
            <label className="block text-[11.5px] font-semibold text-ink-950 mb-1">Notes to reviewer <span className="font-normal text-neutral-500">optional</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Explain any large variances, gaps, or context the reviewer should know about…" className="w-full px-3 py-2 border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15" />
            <div className="text-[10.5px] text-neutral-500 mt-1">Recommended where any value differs by more than 20% from your prior year.</div>
            <label className="flex items-start gap-2 mt-3 text-[12px] text-neutral-700">
              <input type="checkbox" checked={confirmDecl} onChange={(e) => setConfirmDecl(e.target.checked)} className="mt-0.5" />
              <span>I confirm the data submitted is accurate to the best of my knowledge, reconciled with {sub.entityName} internal records, and complies with DoE Regulation PPS-04. <span className="text-doe-red">*</span></span>
            </label>
          </div>
        </div>
      </div>

      {/* ============== STICKY FOOTER ============== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 shadow-doe-md z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success-500" />
            <span className="text-neutral-700">Draft auto-saved · {formatDateTime(savedAt)} · <strong>{filled.count}/{filled.total}</strong> fields complete</span>
            {isAhmed ? (
              <>
                {validationAttempted && missingCount > 0 && (
                  <button
                    onClick={goToMissingField}
                    className="ml-3 inline-flex items-center gap-1 text-danger-500 font-semibold underline decoration-danger-500/40 underline-offset-2 hover:decoration-danger-500"
                  >
                    {missingCount} mandatory field{missingCount > 1 ? 's are' : ' is'} still empty — jump to {missingCount > 1 ? 'next field' : 'field'} →
                  </button>
                )}
                {validationAttempted && missingCount === 0 && (
                  <span className="ml-3 inline-flex items-center gap-1 text-success-500 font-semibold"><CheckIcon /> All mandatory fields complete</span>
                )}
                {error && <span className="text-danger-500 ml-3">{error}</span>}
              </>
            ) : (
              error && <span className="text-danger-500 ml-3">{error}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSaveDraft} className="h-9 px-3.5 rounded-md text-[12.5px] text-neutral-700 hover:bg-neutral-50">Save draft</button>
            <button
              onClick={() => { if (!isAhmed) return; setValidationAttempted(true); if (missingCount > 0) { missingCursor.current = 0; goToMissingField(); } }}
              className="btn-secondary text-[12.5px]"
            ><CheckIcon /> Validate</button>
            <button disabled={submitting} onClick={handleSubmit} className="btn-primary text-[12.5px] disabled:opacity-60">
              Submit to DoE <span className="ml-1">→</span>
            </button>
          </div>
        </div>
      </div>

      <SuccessModal
        open={submittedOpen}
        tone="success"
        title="Submission sent successfully"
        message="Submission successfully sent to DoE for review."
        actionLabel="Done"
        onClose={() => navigate(user?.role === 'pps_entity' ? `/pps/submissions?product=${sub.productId}` : `/pps/submissions/${sub.id}`)}
      />
    </div>
  );
}

// Silence unused-prop warnings on noop renders (formatDate available if needed).
void formatDate;

// ============================================================================
// TemplateReadOnlySections — a 1:1 READ-ONLY render of a Product+Entity template.
// Reuses the EXACT same SectionCard + table components as GenericSubmissionForm
// (YearGridTable / SeasonalSection / RegionSegmentTable / EndUsersSection /
// SubSectorFields) in readOnly mode, so the View screen mirrors the submission
// form's sections, row hierarchy, indentation, totals and fields identically.
// Values come straight from the entity template (same data the form shows).
// ============================================================================
const RO_NOOP = () => {};
export function TemplateReadOnlySections({ template }: { template: EntityTemplate }) {
  const sections = template.sections;
  const years = template.years;
  const unit = template.reportingUnit.replace(/\*+$/, '').trim() || 'Value';

  const computeAuto = (s: TemplateSection): (number | null)[] =>
    s.columns.map((_, ci) => {
      let sum = 0, any = false;
      s.rows.forEach((rr) => {
        if (rr.auto) return;
        const v = rr.values[ci];
        if (v != null) { sum += v; any = true; }
      });
      return any ? +sum.toFixed(2) : null;
    });

  return (
    <div className="space-y-3">
      {sections.map((s, si) => (
        <SectionCard
          key={`${s.no}-${si}`}
          number={s.no}
          title={stripNo(s.title)}
          desc={s.description
            ? <>{s.description}</>
            : s.kind === 'qualitative'
            ? <>Qualitative input — provide the requested details for the emirate of Abu Dhabi.</>
            : s.kind === 'seasonal'
            ? <>Quarterly split (Q1–Q4) across {years[0]}–{years[years.length - 1]}. Reported in <strong>{unit}</strong>.</>
            : <>Annual volumes {years[0]}–{years[years.length - 1]}. Reported in <strong>{unit}</strong>. Total rows auto-calculate.</>}
          meta={s.kind === 'qualitative'
            ? 'QUALITATIVE · FREE TEXT'
            : s.kind === 'seasonal'
            ? `UNIT · ${unit} · ${years.length} YEAR-COLS · Q1–Q4 · ${years[0]} → ${years[years.length - 1]}`
            : `UNIT · ${unit} · ${s.columns.length} YEAR-COLS · ${years[0]} → ${years[years.length - 1]}`}
        >
          {s.kind === 'qualitative' && s.qualitative ? (
            <QualitativeSection readOnly data={s.qualitative} values={{}} onChange={RO_NOOP} />
          ) : s.endUsers ? (
            <EndUsersSection
              readOnly
              data={{
                standalone: s.endUsers.standalone.map((r) => ({ label: r.label, values: [...r.values] })),
                regionGroups: s.endUsers.regionGroups.map((g) => ({ region: g.region, segments: g.segments.map((seg) => ({ label: seg.label, values: [...seg.values] })) })),
              }}
              years={years}
              forecastFromIdx={s.forecastFromIdx}
              onStandaloneChange={RO_NOOP}
              onSegmentChange={RO_NOOP}
            />
          ) : s.regionGroups ? (
            <RegionSegmentTable
              readOnly
              groups={s.regionGroups.map((g) => ({ region: g.region, segments: g.segments.map((seg) => ({ label: seg.label, values: [...seg.values] })) }))}
              years={years}
              forecastFromIdx={s.forecastFromIdx}
              totalLabel={s.totalLabel ?? 'Total demand from your company'}
              onChange={RO_NOOP}
            />
          ) : s.kind === 'seasonal' && s.seasonalCategories ? (
            <SeasonalSection
              readOnly
              categories={s.seasonalCategories.map((c) => ({ label: c.label, qByYear: Object.fromEntries(Object.entries(c.qByYear).map(([y, arr]) => [y, [...arr]])) }))}
              years={years}
              forecastFromIdx={s.forecastFromIdx}
              onChange={RO_NOOP}
            />
          ) : s.rows.length > 0 ? (
            <YearGridTable
              readOnly
              fieldHeader="Field"
              columns={s.columns}
              forecastFromIdx={s.forecastFromIdx}
              rows={s.rows.map((r) => ({
                label: r.label,
                mandatory: r.mandatory && !r.auto,
                isFormula: r.auto,
                values: r.auto ? computeAuto(s) : [...r.values],
              }))}
            />
          ) : null}
          <SubSectorFields readOnly labels={s.subSectors ?? []} values={(s.subSectors ?? []).map((_, i) => s.subSectorValues?.[i] ?? '')} onChange={RO_NOOP} />
        </SectionCard>
      ))}
    </div>
  );
}

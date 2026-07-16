import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PPS_SUBMISSION_TASKS, getProduct, entityProductIds, productEntities, ENTITY_PRODUCTS, PPS_PRODUCTS, PPS_PRODUCT_ORDER } from '../../data/pps';
import { usePpsSubmissions, buildClarificationSubmission } from '../../store/ppsSubmissions';
import { useAuth } from '../../store/auth';
import { cn, AHMED_ID, OMAR_ID } from '../../lib/utils';
import { formatDate, formatDateTime } from '../../lib/utils';
import { ProductPicker } from '../../components/pps/ProductPicker';
import { PlayersModule } from '../../components/pps/PlayersModule';
import { TpisModule } from '../../components/pps/TpisModule';
import { PLAYERS_BY_PRODUCT, TPIS_BY_PRODUCT, TPI_COLUMNS_BY_PRODUCT } from '../../data/pps-modules';
import type { PlayerCompany } from '../../data/pps-modules';
import { AddPlayerModal } from '../../components/pps/AddPlayerModal';
import { draftRouteFor, PRODUCT_DRAFTS } from '../../data/pps-fields';
import { StatusPill } from '../../components/pps/StatusPill';
import { ReminderModal } from '../../components/pps/ReminderModal';
import { WorkflowTimeline } from '../../components/pps/WorkflowTimeline';
import type { Submission, SubmissionStatus, SubmissionTask } from '../../types/pps';

export function PpsSubmissionsPage() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const allSubs = usePpsSubmissions((s) => s.submissions);
  const createDraft = usePpsSubmissions((s) => s.createDraft);
  const deleteSubmission = usePpsSubmissions((s) => s.deleteSubmission);
  const sendReminder = usePpsSubmissions((s) => s.sendReminder);
  const isRegulator = user?.role === 'pps_reviewer' || user?.role === 'pps_approver';
  // Ahmed Al Mazrouei (entity submitter) — header/KPI refinements (tighter cards,
  // compact product selector). Omar Al Suwaidi (internal DoE PPS Approver) gets
  // the SAME finalized Submissions UX; `finalizedUx` drives the redesigned layout
  // for both, while role-specific bits (entity dropdown shown for internal only,
  // entity-only synthetic rows / pending tasks kept to Ahmed) stay separate.
  const isAhmed = user?.id === AHMED_ID;
  const isOmar = user?.id === OMAR_ID;
  const finalizedUx = isAhmed || isOmar;

  // "+ New submission" ALWAYS creates a brand-new fresh Draft record (unique id)
  // for the selected product — it never inherits an existing record's state, so
  // the status badge is always Draft and Submit to DoE is enabled. Users can
  // create and submit unlimited submissions per product; each one accumulates in
  // the All-submissions table and queues to the DoE approver. Applies to all 12.
  function startNewSubmission(pid: string) {
    const m = PRODUCT_DRAFTS[pid] ?? PRODUCT_DRAFTS.lpg;
    const newId = createDraft({
      productId: m.productId,
      productLabel: m.productLabel,
      productLabelLong: m.productLabelLong,
      productModel: m.productModel,
      entityId: m.entityId,
      entityName: m.entityName,
      cycleYear: 2025,
      formType: m.formType,
      submittedBy: m.entityName,
    });
    navigate(`/pps/submissions/${newId}/edit`);
  }

  // 'overdue' is a dynamic, due-date-driven filter (Ahmed only) — not a workflow
  // status; records keep their real status badge (see isOverdueSubmission).
  const [statusTab, setStatusTab] = useState<'all' | 'overdue' | SubmissionStatus>('all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(0); // "All" — show the full multi-year history
  // Ahmed-only "All submissions" toolbar: Status + Entity dropdowns + advanced
  // filter sheet (Period / Sort / Submission date / Version). Defaults are inert
  // for everyone else.
  const [entityFilter, setEntityFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Ahmed-only: scroll-to + brief flash on the action-needed rows from the KPI.
  const allSubsRef = useRef<HTMLDivElement | null>(null);
  const [flashAction, setFlashAction] = useState(false);
  // Selected product. For Omar (internal approver) the product filter supports
  // "All Products" and persists across PPS screens via localStorage, so the
  // context survives navigation; everyone else keeps the URL (?product=…) scope.
  const [searchParams, setSearchParams] = useSearchParams();
  // Omar now uses the SAME product selector as Ahmed (the rich two-column
  // ProductPicker), which has no "All Products" entry — so a concrete product is
  // always selected. Migrate any previously-stored 'all' to a real product.
  const [omarProduct, setOmarProduct] = useState(() => {
    const v = localStorage.getItem('doe.pps.omar.product');
    return v && v !== 'all' ? v : 'lpg';
  });
  const productId = isOmar ? omarProduct : (searchParams.get('product') ?? 'lpg');
  const setProductId = (id: string) => {
    if (isOmar) { setOmarProduct(id); localStorage.setItem('doe.pps.omar.product', id); }
    else setSearchParams({ product: id }, { replace: true });
  };
  const allProducts = productId === 'all';

  // Entity category tabs — Ahmed (Entity Submitter) ONLY. A secondary horizontal
  // nav below the description switches the content beneath the KPI cards. The tab
  // SET is per-product: every product has Supply & Demand + Players; Diesel and
  // LPG additionally have a TPIs tab. Default = Supply & Demand on every product.
  const showEntityTabs = isAhmed;
  const [entityTab, setEntityTab] = useState<'supply' | 'players' | 'tpis'>('supply');
  // Add New Player modal + in-session players added from it (keyed by product
  // label, merged into the Players table so new rows appear without a refresh).
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [addedPlayers, setAddedPlayers] = useState<Record<string, PlayerCompany[]>>({});
  const [playerToast, setPlayerToast] = useState(false);
  // Reset to Supply & Demand whenever the product changes.
  useEffect(() => { setEntityTab('supply'); }, [productId]);
  // Products that carry the extra TPIs (third-party inspectors) tab.
  const TPI_PRODUCTS = ['lpg', 'diesel'];
  const entityTabDefs: [typeof entityTab, string][] = [
    ['supply', 'Supply & Demand'],
    ['players', 'Players'],
    ...(TPI_PRODUCTS.includes(productId) ? ([['tpis', 'TPIs']] as [typeof entityTab, string][]) : []),
  ];
  // Guard against a stale tab during the product-change render (before the reset
  // effect runs): only honour the active tab if it exists for this product.
  const activeEntityTab = entityTabDefs.some(([id]) => id === entityTab) ? entityTab : 'supply';
  const entityModuleActive = showEntityTabs && activeEntityTab !== 'supply';
  // Omar: the same per-product category tabs live inside the All Submissions card
  // (below the search row). When a module tab is active, the submissions table is
  // swapped for the Players / TPIs module — mirroring Ahmed's tab behaviour.
  const omarModuleActive = isOmar && activeEntityTab !== 'supply';
  // Ahmed only: hide the 4 KPI cards on the module tabs (Players / TPIs) of
  // these products, so the table sits directly below the category tabs. Supply &
  // Demand keeps the KPIs; other products keep them on every tab.
  const hideKpiStrip = entityModuleActive && ['natural_gas', 'gasoline_98', 'diesel', 'lpg', 'ethanol', 'biodiesel', 'fuel_oil', 'jet_a1', 'saf', 'lng', 'naphtha'].includes(productId);
  // Entity (Ahmed) layout for every product: the New Submission CTA sits in the
  // tabs row (right-aligned, below the dropdown), matching the finalized Gasoline
  // placement. The CTA label below tracks the active tab on every product.
  const showEntityCtaRow = isAhmed;
  const entityCtaLabel =
    activeEntityTab === 'players' ? 'Add New Player' :
    activeEntityTab === 'tpis' ? 'Add New TPI' :
    'New Submission';
  // The per-product category tabs, rendered once and reused (full-width row for
  // most products; shared with the CTA in a single row for Gasoline).
  const entityTabsEl = entityTabDefs.map(([id, label]) => {
    const active = activeEntityTab === id;
    return (
      <button
        key={id}
        onClick={() => setEntityTab(id)}
        className={cn(
          'relative h-10 px-3.5 text-[13px] transition-colors border-b-2 -mb-px',
          active
            ? 'border-action-orange text-ink-950 font-semibold'
            : 'border-transparent text-neutral-500 font-medium hover:text-ink-950',
        )}
      >
        {label}
      </button>
    );
  });

  const product = getProduct(productId);
  // `productLabel` stays canonical (it keys PLAYERS_BY_PRODUCT / TPIS_BY_PRODUCT).
  // Ahmed-only display renames: Jet A-1 → Jet Fuel, Gasoline (98) → Gasoline.
  // Other users keep the canonical labels.
  const productLabel = product?.label ?? (allProducts ? 'All Products' : productId);
  const displayLabel = (lbl: string) => {
    if (!isAhmed) return lbl;
    if (lbl === 'Jet A-1') return 'Jet Fuel';
    if (lbl === 'Gasoline (98)') return 'Gasoline';
    return lbl;
  };
  const productLabelDisplay = displayLabel(productLabel);
  // Base players for the current product + any added this session (new rows show
  // immediately, no refresh). Data keys stay canonical (productLabel).
  const currentPlayers = [...(PLAYERS_BY_PRODUCT[productLabel] ?? []), ...(addedPlayers[productLabel] ?? [])];
  function handleAddPlayer(player: PlayerCompany) {
    setAddedPlayers((prev) => ({ ...prev, [productLabel]: [...(prev[productLabel] ?? []), player] }));
    setAddPlayerOpen(false);
    setPlayerToast(true);
    window.setTimeout(() => setPlayerToast(false), 2600);
  }

  // Every figure on this screen is scoped to the selected product (or all).
  const productSubs = useMemo(() => allProducts ? allSubs : allSubs.filter((s) => s.productId === productId), [allSubs, productId, allProducts]);

  // Ahmed only: the All-submissions table shows "returned for clarification" rows
  // so two action-needed rows are highlighted (display only — does NOT feed the
  // KPIs, so other cards are unaffected, and nobody else sees them). Each carries
  // a real RETURNED workflow (via buildClarificationSubmission) and a stable id
  // (`ahmed-clarif-<productId>-<i>`) so opening it shows the returned workflow.
  const tableBase = useMemo(() => {
    // Omar (PPS DoE Approver): drafts are never shown in the All Submissions table
    // (display-only — KPIs and other screens are unaffected). Order is preserved.
    if (isOmar) return productSubs.filter((s) => s.status !== 'draft');
    if (!isAhmed) return productSubs;
    const base = productSubs[0];
    if (!base) return productSubs;
    const need = Math.max(0, 2 - productSubs.filter((s) => s.status === 'returned').length);
    if (need === 0) return productSubs;
    const synths: Submission[] = Array.from({ length: need }, (_, i) => buildClarificationSubmission(base, i));
    return [...productSubs, ...synths];
  }, [productSubs, isAhmed, isOmar]);

  const subs = useMemo(() => {
    return tableBase
      .filter((s) =>
        statusTab === 'all' ? true
        : statusTab === 'overdue' ? isOverdueSubmission(s)
        : s.status === statusTab)
      .filter((s) => !search || s.ref.toLowerCase().includes(search.toLowerCase()) || s.productLabel.toLowerCase().includes(search.toLowerCase()))
      .filter((s) => s.cycleYear === period || period === 0)
      .filter((s) => entityFilter === 'all' || s.entityName === entityFilter)
      .sort((a, b) => {
        const cmp = (b.submittedOn ?? '').localeCompare(a.submittedOn ?? '');
        return sortOrder === 'oldest' ? -cmp : cmp;
      });
  }, [tableBase, statusTab, search, period, entityFilter, sortOrder]);

  // Entity filter options = entities authorised to submit the selected product
  // (BRD §16), independent of which entities have submissions yet.
  // Entity-filter options: all licensed entities when "All Products", else the
  // entities authorised for the selected product (BRD §16).
  const entityOptions = useMemo(() => allProducts ? Object.keys(ENTITY_PRODUCTS) : productEntities(productId), [productId, allProducts]);
  // Reset the entity filter whenever the product changes (its entity list does).
  useEffect(() => { setEntityFilter('all'); }, [productId]);

  const statusCounts: Record<'all' | SubmissionStatus, number> = {
    all:        productSubs.length,
    approved:   productSubs.filter((s) => s.status === 'approved').length,
    in_review:  productSubs.filter((s) => s.status === 'in_review').length,
    submitted:  productSubs.filter((s) => s.status === 'submitted').length,
    returned:   productSubs.filter((s) => s.status === 'returned').length,
    resubmitted:productSubs.filter((s) => s.status === 'resubmitted').length,
    amendment_requested: productSubs.filter((s) => s.status === 'amendment_requested').length,
    draft:      productSubs.filter((s) => s.status === 'draft').length,
    rejected:   productSubs.filter((s) => s.status === 'rejected').length,
  };

  // ---- Per-product KPI + pending-task derivation (from the store records) ----
  const submittedSubs = productSubs.filter((s) => s.status !== 'draft');
  const actionSubs    = productSubs.filter((s) => s.status === 'draft' || s.status === 'returned');
  // Ahmed only: "Action Needed" reflects the 2 pending submission tasks shown.
  const actionCount   = isAhmed ? 2 : actionSubs.length;
  const submittedCount = submittedSubs.length;
  const requiredCount  = allProducts ? PPS_PRODUCTS.length : 1; // annual forms (per product / all)

  // Pending tasks: keep the rich seeded cards where they exist for this product,
  // otherwise derive a task from the product's own draft/returned records.
  const tasks: SubmissionTask[] = useMemo(() => {
    const seeded = PPS_SUBMISSION_TASKS.filter((t) => t.productId === productId);
    if (seeded.length) return seeded;
    return actionSubs.map((s) => ({
      id: s.id,
      productId: s.productId,
      productLabel: s.productLabel,
      cycleYear: s.cycleYear,
      formType: `${s.formType} · 12 year-cols`,
      dueOn: '2026-04-30T00:00:00Z',
      status: (s.draftCompletePct ?? 0) > 0 ? 'overdue' : 'not_started',
      draftPct: (s.draftCompletePct ?? 0) > 0 ? s.draftCompletePct : undefined,
    }));
  }, [productId, actionSubs]);
  const overdueTask = tasks.find((t) => t.status === 'overdue');

  // Ahmed only: the second (2026) task for the SELECTED product is presented as a
  // DoE "returned for clarification" request — content override only (id
  // `clarifTaskId`), the card design is unchanged. Applies across all 12 products
  // so every module's Action Required mirrors LPG. Others keep "not started".
  const clarifTaskId = `task-${productId}-2026`;
  const displayTasks = useMemo(() => {
    if (!isAhmed) return tasks;
    return tasks.map((t) =>
      t.id === clarifTaskId
        ? { ...t, notes: 'DoE requested additional information for your 2026 submission. Please clarify the Q3 distributor volume and upload the supporting demand breakdown.' }
        : t,
    );
  }, [isAhmed, tasks]);

  // Omar (DoE PPS Approver) — "Action Required": submissions that need HIS
  // action right now. Newly Submitted (awaiting first review), Re-submitted
  // (entity responded to a clarification), and In-review (continuation). Excludes
  // approved / rejected / drafts and "returned" (waiting on the entity, not Omar).
  const omarActionSubs = useMemo(() => {
    if (!isOmar) return [];
    const rank: Record<string, number> = { resubmitted: 0, submitted: 1, in_review: 2 };
    return productSubs
      .filter((s) => s.status === 'submitted' || s.status === 'resubmitted' || s.status === 'in_review')
      .sort((a, b) => {
        const r = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        // Within a rank, oldest-submitted first = nearest review SLA = highest priority.
        return r !== 0 ? r : (a.submittedOn ?? '').localeCompare(b.submittedOn ?? '');
      });
  }, [isOmar, productSubs]);
  // Surface only the two highest-priority items on the dashboard; the full queue
  // is one click away via "View all (N)".
  const omarActionShown = omarActionSubs.slice(0, 2);

  const statusText = (st: SubmissionStatus) =>
    st === 'approved' ? 'approved' : st === 'in_review' ? 'in DoE review' :
    st === 'submitted' ? 'submitted' : st === 'returned' ? 'returned' :
    st === 'resubmitted' ? 're-submitted' : st === 'rejected' ? 'rejected' : st;
  const submittedLines = submittedSubs
    .slice()
    .sort((a, b) => (b.submittedOn ?? '').localeCompare(a.submittedOn ?? ''))
    .slice(0, 2)
    .map((s) => `${displayLabel(s.productLabel)} ${s.cycleYear} · ${statusText(s.status)}${s.submittedOn ? ` · ${formatDate(s.submittedOn)}` : ''}`);
  const onTimeCount = submittedSubs.filter((s) => s.submittedOn && new Date(s.submittedOn) <= new Date('2026-04-30T23:59:59Z')).length;
  const compliancePct = submittedCount > 0 ? Math.round((onTimeCount / submittedCount) * 100) : null;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-12 bg-neutral-25 min-h-screen">
      {/* ============== HEADER ============== */}
      <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500 mb-2">
        {isRegulator ? 'DoE PPS · review queue' : 'Data submissions'}
      </div>
      <div className="flex items-start justify-between gap-6 flex-wrap mb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[28px] font-bold text-charcoal-900 leading-tight">
              {isOmar ? 'PPS Submissions' : isRegulator ? 'Review queue · all entities' : 'My submissions & pending tasks'}
            </h1>
            {!isRegulator && <span className="chip-sm bg-info-soft text-info-500">● {tasks.length} tasks pending</span>}
            {isRegulator && (statusCounts.submitted + statusCounts.in_review + statusCounts.resubmitted) > 0 && (
              <span className="chip-sm bg-lavender text-[#7B3FE4]">● {statusCounts.submitted + statusCounts.in_review + statusCounts.resubmitted} awaiting review</span>
            )}
          </div>
          <p className="text-[12.5px] text-neutral-700 mt-2 max-w-[760px]">
            {isRegulator ? (
              <>Review and approve petroleum-products data submissions from all licensed entities. Returns are sent back to the submitter with your remarks for correction.</>
            ) : (
              <>Submit supply, demand and infrastructure data for <strong>{productLabelDisplay}</strong>.
                 This is ADNOC Distribution&rsquo;s {productLabelDisplay} {product?.model === 'supplier' ? 'supplier' : 'distributor'} submission for the 2025 cycle.</>
            )}
          </p>
        </div>
        {/* Gasoline (Ahmed): the dropdown sits alone at the top right; its New
            Submission CTA drops into the tabs row below (aligned with the tabs).
            Every other product/user keeps the dropdown + CTA side by side. */}
        <div className={cn(showEntityCtaRow ? 'flex flex-col items-end' : 'flex items-center gap-2')}>
          {/* ONE shared Product Selection component for both roles. Omar (DoE PPS
              Approver) reuses Ahmed's exact rich two-column ProductPicker — only
              the underlying data changes when a product is picked. */}
          <ProductPicker
            value={productId}
            onChange={setProductId}
            eyebrow={isRegulator ? 'Filter product' : 'Submission product'}
            triggerSubtext={(p) => `${p.annualVolumeMt.toFixed(2)} Mt · ${p.model === 'distributor' ? 'Distributor' : 'Supplier'} model`}
            // LPG-only experiment (Mariam · approver): compact h-10 trigger.
            compact={productId === 'lpg' && user?.role === 'pps_approver'}
            // Ahmed + Omar: the modern compact trigger matched to the CTA height.
            tight={isAhmed || isOmar}
            // Entity User: show only their mapped products, in BRD master order.
            // DOE reviewers/approvers keep the full default list (unchanged).
            productIds={!isRegulator ? entityProductIds(user?.company?.name) : undefined}
            // Omar: reorder the full list to Ahmed's BRD master order (counts unchanged).
            order={isOmar ? PPS_PRODUCT_ORDER : undefined}
            // Ahmed-only display rename: Jet A-1 → Jet Fuel (trigger + menu item).
            labelOverride={isAhmed ? (p) => displayLabel(p.label) : undefined}
          />
          {/* Non-Gasoline: CTA sits beside the dropdown. Gasoline renders its
              CTA in the tabs row below instead (so it aligns with the tabs). The
              label tracks the active tab (entityCtaLabel) on every product. */}
          {!isRegulator && !showEntityCtaRow && (
            <button
              onClick={() => (activeEntityTab === 'players' ? setAddPlayerOpen(true) : startNewSubmission(productId))}
              className="h-10 px-4 rounded-md bg-action-orange text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-action-orange-dark"
            >
              <span className="text-[16px] leading-none">+</span> {entityCtaLabel}
            </button>
          )}
          {isRegulator && (
            <button onClick={() => navigate('/pps/monitoring')} className="btn-secondary h-10">
              Monitoring view →
            </button>
          )}
        </div>
      </div>

      {/* ============== CATEGORY TABS (Ahmed · every product) ============== */}
      {showEntityTabs && (
        showEntityCtaRow ? (
          // Entity (Ahmed), every product: tabs + New Submission CTA form a single
          // aligned row. The divider runs under the tabs (full-bleed left) and stops
          // ~28px before the button; the CTA is vertically centred with the tabs.
          <div className="flex items-end justify-between gap-7 mt-4">
            <div className="flex items-center gap-1 flex-1 border-b border-neutral-200 -ml-6 pl-6">
              {entityTabsEl}
            </div>
            {!isRegulator && (
              <button
                onClick={() => (activeEntityTab === 'players' ? setAddPlayerOpen(true) : startNewSubmission(productId))}
                className="h-10 px-4 flex-shrink-0 rounded-md bg-action-orange text-white text-[13px] font-semibold flex items-center gap-1.5 hover:bg-action-orange-dark"
              >
                <span className="text-[16px] leading-none">+</span> {entityCtaLabel}
              </button>
            )}
          </div>
        ) : (
          <div className="border-b border-neutral-200 -mx-6 px-6 mt-4">
            <div className="flex items-center gap-1">{entityTabsEl}</div>
          </div>
        )
      )}

      {/* ============== TOP KPI STRIP ============== */}
      {!hideKpiStrip && (
      <div className="grid grid-cols-4 gap-3 mt-4 mb-6">
        <SubKpi
          label="Required Forms"
          value={`${requiredCount} product · 2025 cycle`}
          big={String(requiredCount)}
          icon="📄"
          subLines={[productLabelDisplay]}
          compact={finalizedUx}
        />
        <SubKpi
          label="Submitted"
          value={`${submittedCount} submitted`}
          big={String(submittedCount)}
          icon="✓"
          // Compact cards (Ahmed/Omar): show a single most-recent line.
          subLines={(finalizedUx ? submittedLines.slice(0, 1) : submittedLines).length ? (finalizedUx ? submittedLines.slice(0, 1) : submittedLines) : ['No submissions yet']}
          compact={finalizedUx}
        />
        <SubKpi
          label="Action Needed"
          value={`${actionCount} ${actionCount === 1 ? 'item' : 'items'}`}
          big={String(actionCount)}
          icon="⚠"
          tint="warn"
          subLines={overdueTask ? [
            `${displayLabel(overdueTask.productLabel)} · was due ${formatDate(overdueTask.dueOn)} · ${daysOverdue(overdueTask.dueOn)} days overdue`,
          ] : actionSubs.length ? [`${productLabelDisplay} · awaiting action`] : []}
          compact={finalizedUx}
          onClick={finalizedUx ? () => {
            allSubsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setFlashAction(true);
            window.setTimeout(() => setFlashAction(false), 1800);
          } : undefined}
        />
        <SubKpi
          label="Compliance · 12 mo"
          value={compliancePct == null ? 'No history yet' : `${compliancePct}% on-time`}
          big={compliancePct == null ? '—' : String(compliancePct)}
          bigSuffix={compliancePct == null ? undefined : '%'}
          icon="📈"
          tint="success"
          subLines={compliancePct == null ? ['No submissions yet'] : [`${onTimeCount} of ${submittedCount} on time`]}
          compact={finalizedUx}
        />
      </div>
      )}

      {/* ============== TAB CONTENT (below the KPI cards) ==============
          Supply & Demand (default) keeps the existing dashboard; Players / TPIs
          swap in their per-product workspace using the same page structure. When
          the KPI strip is hidden, add the top gap it used to provide. */}
      {entityModuleActive ? (
        <div className={cn(hideKpiStrip && 'mt-4')}>
          {activeEntityTab === 'players'
            ? <PlayersModule productLabel={productLabelDisplay} players={currentPlayers} preserveOrder={productId === 'lpg' || productId === 'diesel'} cleanLayout={productId === 'lpg' || productId === 'diesel' || productId === 'natural_gas' || productId === 'cng' || productId === 'ethanol' || productId === 'biodiesel' || productId === 'fuel_oil' || productId === 'jet_a1' || productId === 'saf' || productId === 'lng' || productId === 'naphtha'} />
            : <TpisModule productLabel={productLabelDisplay} sites={TPIS_BY_PRODUCT[productLabel] ?? []} columns={TPI_COLUMNS_BY_PRODUCT[productLabel] ?? TPI_COLUMNS_BY_PRODUCT.Diesel} preserveOrder={productId === 'lpg' || productId === 'diesel'} />}
        </div>
      ) : (
      <>
      {/* ============== PENDING TASKS (entity only) ============== */}
      {!isRegulator && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[16px] font-bold text-ink-950">{isAhmed ? 'Action Required' : 'Pending submission tasks'}</h2>
              <p className="text-[11.5px] text-neutral-500">{isAhmed ? 'Applications that require your attention, including overdue submissions and requests for additional information.' : 'Reminders go out 7 and 2 days before due date · escalation after 10 days overdue'}</p>
            </div>
            {isAhmed ? (
              <button
                onClick={() => navigate('/pps/submissions')}
                className="group inline-flex items-center gap-1 text-[12px] text-info-500 font-semibold transition-colors hover:text-[#0A5E86] hover:underline"
              >
                View all ({tasks.length})
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            ) : (
              <button className="text-[12px] text-info-500 font-semibold hover:underline">Configure reminders</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {displayTasks.map((t) => <PendingTaskCard key={t.id} task={{ ...t, productLabel: displayLabel(t.productLabel) }} navigate={navigate} entityLayout={isAhmed} clarification={isAhmed && t.id === clarifTaskId} />)}
          </div>
        </div>
      )}

      {/* ====== ACTION REQUIRED (DoE PPS Approver — Omar Al Suwaidi) ======
          Same card/spacing/typography as the entity dashboard, but surfaces
          review-actionable items (Submitted / Re-submitted / In-review) instead
          of the entity's overdue drafts. */}
      {isOmar && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-[16px] font-bold text-ink-950">Action Required</h2>
              <p className="text-[11.5px] text-neutral-500">Applications currently awaiting your review or returned by entities after clarification.</p>
            </div>
            <button
              onClick={() => { setStatusTab('all'); allSubsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
              className="group inline-flex items-center gap-1 text-[12px] text-info-500 font-semibold transition-colors hover:text-[#0A5E86] hover:underline"
            >
              View all ({omarActionSubs.length})
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
          {omarActionShown.length ? (
            <div className="grid grid-cols-2 gap-3">
              {omarActionShown.map((s) => (
                <OmarActionCard
                  key={s.id}
                  sub={s}
                  navigate={navigate}
                  onSendReminder={(opts) => sendReminder(s.id, { id: user!.id, name: user!.name, role: user!.role }, opts)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-25 py-10 text-center">
              <div className="text-[13px] font-semibold text-ink-950">You&rsquo;re all caught up</div>
              <p className="text-[11.5px] text-neutral-500 mt-1">No submissions are currently awaiting your review{allProducts ? '' : ` for ${productLabel}`}.</p>
            </div>
          )}
        </div>
      )}

      {/* ============== ALL SUBMISSIONS TABLE ============== */}
      <div ref={allSubsRef} className="card overflow-hidden scroll-mt-4">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[16px] font-bold text-ink-950">All submissions</h2>
            <p className="text-[11.5px] text-neutral-500">Annual + amendment history across all products you are licensed for</p>
          </div>
          <button className="btn bg-white border border-neutral-200 text-neutral-700 text-[12px] hover:bg-neutral-50">
            <DownloadIcon /> Export CSV
          </button>
        </div>

        {/* Filter row */}
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[280px] max-w-[400px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product, period, status, or ref..."
              className="w-full pl-9 pr-3 h-9 bg-white border border-neutral-200 rounded-md text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-2 focus:ring-action-orange/15"
            />
          </div>
          {finalizedUx ? (
            // Finalized toolbar (Ahmed + Omar): Status dropdown + (Entity dropdown
            // for internal users only) + advanced-filter sheet button. The Entity
            // filter is hidden for the entity submitter (single organisation) and
            // shown for internal users (multi-company), populated per BRD product.
            <div className="ml-auto flex items-center gap-2">
              <select value={statusTab} onChange={(e) => setStatusTab(e.target.value as 'all' | 'overdue' | SubmissionStatus)} className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px]">
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In DoE Review</option>
                <option value="overdue">Overdue</option>
                <option value="returned">Returned for Clarification</option>
                <option value="approved">Approved &amp; Published</option>
                <option value="draft">Draft</option>
              </select>
              {isRegulator && <EntityFilterDropdown value={entityFilter} onChange={setEntityFilter} entities={entityOptions} />}
              <button onClick={() => setFilterSheetOpen(true)} title="Advanced filters" className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px] flex items-center gap-1.5 hover:bg-neutral-50">
                <FilterIcon /> Filters
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all','approved','in_review','returned','draft'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStatusTab(t)}
                    className={cn(
                      'h-9 px-2.5 rounded-md text-[12px] font-semibold flex items-center gap-1.5',
                      statusTab === t ? 'bg-ink-950 text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    {t === 'all' ? 'All' : t === 'in_review' ? 'In DoE review' : t.charAt(0).toUpperCase() + t.slice(1)}
                    <span className={cn('inline-flex items-center h-4 px-1.5 rounded-full text-[10px] font-bold', statusTab === t ? 'bg-white/20' : 'bg-neutral-100 text-neutral-700')}>{statusCounts[t]}</span>
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px]">
                  <option value={0}>Period · All</option>
                  <option value={2025}>Period · 2025</option>
                  <option value={2024}>Period · 2024</option>
                </select>
                <button className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px] flex items-center gap-1">Sort: Newest ▾</button>
              </div>
            </>
          )}
        </div>

        {/* Omar: per-product category tabs below the search row (same component as
            Ahmed's). Supply & Demand shows the submissions table; Players / TPIs
            swap in the matching module. Hidden for all other users. */}
        {isOmar && (
          <div className="px-5 border-b border-neutral-100">
            <div className="flex items-center gap-1">{entityTabsEl}</div>
          </div>
        )}

        {omarModuleActive ? (
          activeEntityTab === 'players'
            ? <PlayersModule bare productLabel={productLabelDisplay} players={PLAYERS_BY_PRODUCT[productLabel] ?? []} preserveOrder={productId === 'lpg' || productId === 'diesel'} cleanLayout={productId === 'lpg' || productId === 'diesel' || productId === 'natural_gas' || productId === 'cng' || productId === 'ethanol' || productId === 'biodiesel' || productId === 'fuel_oil' || productId === 'jet_a1' || productId === 'saf' || productId === 'lng' || productId === 'naphtha'} />
            : <TpisModule bare productLabel={productLabelDisplay} sites={TPIS_BY_PRODUCT[productLabel] ?? []} columns={TPI_COLUMNS_BY_PRODUCT[productLabel] ?? TPI_COLUMNS_BY_PRODUCT.Diesel} preserveOrder={productId === 'lpg' || productId === 'diesel'} />
        ) : (
        <table className="w-full">
          <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-2.5">Product</th>
              <th className="text-left px-5 py-2.5">Period</th>
              <th className="text-left px-5 py-2.5">Form type</th>
              <th className="text-left px-5 py-2.5">Submitted</th>
              <th className="text-left px-5 py-2.5">Submitted by</th>
              <th className="text-left px-5 py-2.5">Version</th>
              <th className="text-left px-5 py-2.5">Status</th>
              <th className="px-3 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr
                key={s.id}
                className={cn('border-t border-neutral-100 cursor-pointer transition-colors',
                  finalizedUx && s.status === 'returned'
                    ? cn('bg-warning-soft/40 hover:bg-warning-soft/70', flashAction && 'ring-2 ring-inset ring-warning-500/60')
                    : 'hover:bg-neutral-25')}
                onClick={() => {
                  // Open the row's own record — clarification rows resolve to a
                  // RETURNED workflow via getById's on-demand builder.
                  navigate(s.status === 'draft' ? `/pps/submissions/${s.id}/edit` : `/pps/submissions/${s.id}`);
                }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <ProductBadge productLabel={s.productLabel} />
                    <div>
                      <div className={cn('font-semibold text-ink-950', finalizedUx ? 'text-[12px] font-mono' : 'text-[12.5px]')}>{finalizedUx ? s.ref : s.productLabel}</div>
                      <div className="text-[10.5px] text-neutral-500">Annual</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-[12.5px] text-ink-950">{s.cycleYear}</td>
                <td className="px-5 py-3 text-[12.5px] text-neutral-700">{s.formType}</td>
                <td className="px-5 py-3 font-mono text-[11.5px] text-ink-950">{s.submittedOn ? formatDateTime(s.submittedOn) : <span className="text-neutral-300">—</span>}</td>
                <td className="px-5 py-3 text-[12.5px] text-ink-950">{s.submittedBy}</td>
                <td className="px-5 py-3 font-mono text-[11.5px] text-neutral-700">{s.version}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1.5">
                    {finalizedUx && s.status === 'returned'
                      ? <StatusPill status="returned" label="Returned for Clarification" />
                      : <StatusPill status={s.status} />}
                    {finalizedUx ? <MiniWorkflow3 submission={s} /> : <WorkflowTimeline submission={s} variant="compact" />}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-neutral-400">
                    <button className="w-7 h-7 grid place-items-center hover:bg-neutral-100 rounded-md"><EyeIcon /></button>
                    {finalizedUx ? (
                      <RowActionsMenu
                        status={s.status}
                        internal={isRegulator}
                        onView={() => navigate(`/pps/submissions/${s.id}`)}
                        onDownloadPdf={() => { /* placeholder — mirrors the detail-page Download PDF */ }}
                        onEdit={() => navigate(`/pps/submissions/${s.id}/edit`)}
                        onDelete={() => deleteSubmission(s.id)}
                      />
                    ) : (
                      <button className="w-7 h-7 grid place-items-center hover:bg-neutral-100 rounded-md">⋯</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-[12.5px] text-neutral-500">No submissions match.</td></tr>
            )}
          </tbody>
        </table>
        )}
      </div>
      </>
      )}

      {/* Ahmed only — advanced filters side sheet (Period / Sort / Submission
          date / Version). Period + Sort drive the table; the rest are scoped
          inputs for the demo. */}
      {finalizedUx && filterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-ink-950/30" onClick={() => setFilterSheetOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-[360px] bg-white shadow-doe-xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[15px] font-bold text-ink-950">Advanced filters</h3>
              <button onClick={() => setFilterSheetOpen(false)} className="text-neutral-500 hover:text-ink-950 text-[14px]">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">Period</label>
                <select value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-full h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px]">
                  <option value={0}>All periods</option>
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">Sort</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')} className="w-full h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px]">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">Submission date</label>
                <input type="date" className="w-full h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px]" />
              </div>
              <div>
                <label className="block text-[10.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-1">Version</label>
                <select className="w-full h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12.5px]">
                  <option>All versions</option>
                  <option>v1</option>
                  <option>v2 (amended)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setPeriod(0); setSortOrder('newest'); }} className="flex-1 h-9 rounded-md border border-neutral-200 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50">Reset</button>
              <button onClick={() => setFilterSheetOpen(false)} className="flex-1 h-9 rounded-md bg-action-orange text-white text-[12.5px] font-semibold hover:bg-action-orange-dark">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Player modal — opened from the "+ Add New Player" CTA. */}
      <AddPlayerModal open={addPlayerOpen} productLabel={productLabelDisplay} onClose={() => setAddPlayerOpen(false)} onAdd={handleAddPlayer} />

      {/* Success toast — "Player added successfully." (auto-dismiss). */}
      {playerToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-white rounded-lg shadow-doe-lg border border-neutral-100 px-4 py-2.5 flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-success-soft text-success-500 grid place-items-center flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span className="text-[12.5px] font-semibold text-ink-950">Player added successfully.</span>
        </div>
      )}
    </div>
  );
}

// ====================================================================== Pieces

// Ahmed-only condensed 3-step progress: Submitted → Under review/Returned →
// Approved & Published. Reuses the same dot/connector visual language as the
// 5-step WorkflowTimeline (green completed / orange current / neutral upcoming).
function MiniWorkflow3({ submission }: { submission: Submission }) {
  const st = submission.status;
  const reviewing = st === 'submitted' || st === 'in_review' || st === 'resubmitted' || st === 'returned';
  const step1 = st === 'draft' ? 'upcoming' : 'completed';
  const step2 = st === 'approved' || st === 'rejected' ? 'completed' : reviewing ? 'current' : 'upcoming';
  const step3 = st === 'approved' ? 'completed' : 'upcoming';
  const steps = [step1, step2, step3] as const;
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((state, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <MiniDot state={state} />
          {i < steps.length - 1 && (
            <span className={cn('w-3 h-px', state === 'completed' && (steps[i + 1] === 'completed' || steps[i + 1] === 'current') ? 'bg-success-500' : 'bg-neutral-200')} />
          )}
        </span>
      ))}
    </div>
  );
}

function MiniDot({ state }: { state: 'completed' | 'current' | 'upcoming' }) {
  const ring = state === 'completed' ? 'border-success-500 bg-white' : state === 'current' ? 'border-action-orange bg-white ring-2 ring-action-orange/20' : 'border-neutral-200 bg-white';
  const dotBg = state === 'completed' ? 'bg-success-500' : state === 'current' ? 'bg-action-orange' : 'bg-neutral-200';
  return (
    <span className={cn('inline-grid place-items-center rounded-full border-2 w-3.5 h-3.5', ring)}>
      <span className={cn('rounded-full w-1.5 h-1.5', dotBg)} />
    </span>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// Compact entity filter — lists the entities authorised for the selected product
// (BRD §16). Shows an inline search when the list is long, and a checkmark on the
// selected option. Matches the toolbar's native-select styling.
function EntityFilterDropdown({ value, onChange, entities }: { value: string; onChange: (v: string) => void; entities: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  const showSearch = entities.length > 6;
  const filtered = q ? entities.filter((en) => en.toLowerCase().includes(q.toLowerCase())) : entities;
  const label = value === 'all' ? 'All Entities' : value;
  const pick = (v: string) => { onChange(v); setOpen(false); setQ(''); };
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-9 px-2.5 rounded-md border border-neutral-200 bg-white text-[12px] text-ink-950 flex items-center gap-1.5 min-w-[140px] justify-between hover:bg-neutral-50"
      >
        <span className="truncate">{label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn('flex-shrink-0 text-neutral-400 transition-transform', open && 'rotate-180')}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[240px] bg-white border border-neutral-100 rounded-lg shadow-doe-lg z-50 p-1.5">
          {showSearch && (
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search entities…"
              className="w-full h-8 px-2.5 mb-1 rounded-md border border-neutral-200 text-[12px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20"
            />
          )}
          <div className="max-h-[240px] overflow-y-auto">
            <EntityOption label="All Entities" selected={value === 'all'} onPick={() => pick('all')} />
            {filtered.map((en) => <EntityOption key={en} label={en} selected={value === en} onPick={() => pick(en)} />)}
            {filtered.length === 0 && <div className="px-2.5 py-2 text-[11.5px] text-neutral-400">No entities match.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function EntityOption({ label, selected, onPick }: { label: string; selected: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} className={cn('w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-[12.5px] transition', selected ? 'bg-action-orange-soft text-action-orange-deep font-semibold' : 'text-ink-950 hover:bg-neutral-50')}>
      <span className="w-3.5 flex-shrink-0">{selected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function SubKpi({ label, value, big, bigSuffix, icon, subLines, tint, compact, onClick }: { label: string; value: string; big: string; bigSuffix?: string; icon: string; subLines: string[]; tint?: 'warn' | 'success'; compact?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cn('card', compact ? 'p-3' : 'p-4', tint === 'warn' && 'border-warning-500/30 bg-warning-soft/30', onClick && 'cursor-pointer hover:shadow-doe-md hover:border-warning-500/50 transition')}>
      <div className={cn('flex items-center justify-between', compact ? 'mb-1' : 'mb-2')}>
        <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500">{label}</div>
        <div className={cn('w-6 h-6 rounded-md grid place-items-center text-[12px]',
          tint === 'warn' ? 'bg-warning-soft text-warning-500' :
          tint === 'success' ? 'bg-success-soft text-success-500' :
          'bg-neutral-100 text-neutral-500')}>{icon}</div>
      </div>
      <div className={cn('font-display font-bold text-ink-950 leading-none', compact ? 'text-[30px]' : 'text-[36px]')}>{big}{bigSuffix && <span className="text-[16px] ml-1">{bigSuffix}</span>}</div>
      <div className={cn('text-[11.5px] text-neutral-700', compact ? 'mt-0.5' : 'mt-1')}>{value.includes(big) ? '' : value}</div>
      <div className={cn('space-y-0.5', compact ? 'mt-1.5' : 'mt-2')}>
        {subLines.map((s, i) => (
          <div key={i} className={cn('text-[11px]', tint === 'warn' && s.includes('overdue') ? 'text-danger-500' : 'text-neutral-500')}>{s}</div>
        ))}
      </div>
    </div>
  );
}

function PendingTaskCard({ task, navigate, entityLayout, clarification }: { task: SubmissionTask; navigate: (path: string) => void; entityLayout?: boolean; clarification?: boolean }) {
  const overdue = task.status === 'overdue';
  const overdueDays = daysOverdue(task.dueOn);
  // Entity submitter (Ahmed) cards: only Continue Draft / Respond. Reminder
  // configuration has moved to the DoE PPS Approver (Omar); the entity no longer
  // sees any reminder controls here (see ReminderModal + OmarActionCard).
  return (
    <div className={cn('rounded-lg border p-4', entityLayout && 'flex flex-col h-full', overdue ? 'border-danger-500/30 bg-danger-soft/20' : 'border-neutral-100 bg-white')}>
      <div className="flex items-start gap-3 mb-2">
        <ProductBadge productLabel={task.productLabel} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink-950">{task.productLabel} · {task.cycleYear} annual submission</div>
          <div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 mt-0.5">FORM · ADNOC DISTRIBUTION (PRODUCER) · {task.formType.toUpperCase()}</div>
        </div>
        {clarification ? (
          <span className="chip-sm bg-warning-soft text-warning-500">● Returned for Clarification</span>
        ) : overdue ? (
          <span className="chip-sm bg-danger-soft text-danger-500">● Overdue · {overdueDays} days</span>
        ) : task.status === 'not_started' ? (
          <span className="chip-sm bg-info-soft text-info-500">● Not started</span>
        ) : (
          <span className="chip-sm bg-warning-soft text-warning-500">● {task.status}</span>
        )}
      </div>

      {task.notes && (
        <div
          className={cn('rounded-md p-2.5 text-[11px] mt-2', entityLayout && 'truncate', overdue ? 'bg-danger-soft/40 text-danger-500' : 'bg-neutral-50 text-neutral-700')}
          title={entityLayout ? task.notes : undefined}
        >
          {task.notes}
        </div>
      )}

      <div className={cn('flex items-center justify-between mt-3 pt-3 border-t border-neutral-100', entityLayout && 'mt-auto')}>
        <div>
          <div className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500">{overdue ? 'WAS DUE' : `DUE IN ${daysUntil(task.dueOn)} DAYS`}</div>
          <div className={cn('text-[13px] font-semibold mt-0.5', overdue ? 'text-danger-500' : 'text-ink-950')}>{formatDate(task.dueOn)}</div>
        </div>
        <div className="flex items-center gap-2">
          {task.draftPct != null ? (
            <>
              <span className="text-[11px] text-neutral-500">Draft <strong>{task.draftPct}%</strong> complete</span>
              <div className="w-24 h-1.5 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-action-orange" style={{ width: `${task.draftPct}%` }} /></div>
              <button onClick={() => navigate(draftRouteFor(task.productId))} className="btn-primary text-[12px] h-8 px-3">Continue draft →</button>
            </>
          ) : clarification ? (
            <>
              <span className="text-[11px] text-neutral-500">Awaiting response</span>
              <div className="w-24 h-1.5 rounded-full bg-neutral-100" />
              <button onClick={() => navigate(draftRouteFor(task.productId))} className="btn-secondary text-[12px] h-8 px-3">Respond →</button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-neutral-500">Not started</span>
              <div className="w-24 h-1.5 rounded-full bg-neutral-100" />
              <button onClick={() => navigate(draftRouteFor(task.productId))} className="btn-secondary text-[12px] h-8 px-3">Start →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Known entity → primary submitter contact (for reminder recipient labels).
const ENTITY_CONTACT: Record<string, string> = { 'ADNOC Distribution': 'Ahmed Al Mazrouei' };
function entityContact(sub: Submission): string {
  if (ENTITY_CONTACT[sub.entityName]) return ENTITY_CONTACT[sub.entityName];
  if (sub.submittedBy && sub.submittedBy !== sub.entityName && /\s/.test(sub.submittedBy)) return sub.submittedBy;
  return `${sub.entityName} submitter`;
}

// Action Required card for the DoE PPS Approver (Omar). Mirrors the entity card
// shell (badge · title · meta · status pill · footer) but with a review CTA and
// a Configure-Reminder secondary action (the full recurring-reminder popup)
// that writes to the reminder audit trail on save.
function OmarActionCard({ sub, navigate, onSendReminder }: {
  sub: Submission;
  navigate: (path: string) => void;
  onSendReminder: (opts: { toName: string; channel: string; note?: string }) => void;
}) {
  const [reminderOpen, setReminderOpen] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const recipient = entityContact(sub);

  const variant =
    sub.status === 'submitted'
      // Per Omar's workflow, an Action Required item that has been returned to the
      // entity shows the existing orange "Returned for Clarification" status badge
      // (not the purple "Submitted" badge). Badge only — message/CTA unchanged.
      ? { badge: 'bg-warning-soft text-warning-500', label: 'Returned for Clarification', message: 'New submission awaiting DoE review.', cta: 'Review Submission' }
      : sub.status === 'resubmitted'
      ? { badge: 'bg-info-soft text-info-500', label: 'Re-submitted', message: 'Entity has responded to clarification. Review requested by entity.', cta: 'Continue Review' }
      : { badge: 'bg-info-soft text-info-500', label: 'In Review', message: 'Review in progress — continue where you left off.', cta: 'Continue Review' };

  // Review SLA: 7 days from the (re)submission date.
  const reviewDue = sub.submittedOn ? new Date(new Date(sub.submittedOn).getTime() + 7 * 24 * 3600 * 1000).toISOString() : undefined;
  const reviewOverdue = reviewDue ? new Date(reviewDue) < new Date() : false;
  const submitVerb = sub.status === 'resubmitted' ? 'Re-submitted' : 'Submitted';

  // Adapt the submission to the SubmissionTask shape the (original, full)
  // Configure-Reminder popup expects. The popup is reused exactly as-is.
  const reminderTask: SubmissionTask = {
    id: sub.id,
    productId: sub.productId,
    productLabel: sub.productLabel,
    cycleYear: sub.cycleYear,
    formType: sub.formType,
    dueOn: reviewDue ?? sub.submittedOn ?? new Date().toISOString(),
    status: reviewOverdue ? 'overdue' : 'pending_review',
  };

  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-4 flex flex-col h-full">
      <div className="flex items-start gap-3 mb-2">
        <ProductBadge productLabel={sub.productLabel} />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink-950 truncate">{sub.productLabel} · {sub.cycleYear} annual submission</div>
          <div className="text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-500 mt-0.5 truncate">{sub.entityName} · {sub.formType}</div>
        </div>
        <span className={cn('chip-sm flex-shrink-0', variant.badge)}>● {variant.label}</span>
      </div>

      <div className="flex items-center gap-2 text-[10.5px] text-neutral-500 mb-2">
        <span className="font-mono text-ink-950">{sub.ref}</span>
        {sub.submittedOn && <><span className="text-neutral-300">·</span><span>{submitVerb} {formatDate(sub.submittedOn)}</span></>}
      </div>

      <div className="rounded-md bg-neutral-50 text-neutral-700 p-2.5 text-[11px]">{variant.message}</div>

      {sentAt && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] text-success-500 font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Reminder sent to {recipient}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-neutral-100">
        <div>
          <div className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500">{reviewDue ? (reviewOverdue ? 'Review overdue' : 'Review by') : 'For review'}</div>
          <div className={cn('text-[13px] font-semibold mt-0.5', reviewOverdue ? 'text-danger-500' : 'text-ink-950')}>{reviewDue ? formatDate(reviewDue) : '—'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/pps/submissions/${sub.id}`)} className="btn-primary text-[12px] h-8 px-3">{variant.cta} →</button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setReminderOpen(true); }}
            title="Configure reminder"
            className="h-8 w-8 rounded-md grid place-items-center transition relative flex-shrink-0 border border-neutral-200 text-neutral-400 hover:text-info-500 hover:border-info-500/40"
          >
            <BellIcon />
          </button>
        </div>
      </div>

      {/* The full, original Configure-Reminder popup (recurring scheduling) —
          reused unchanged for Omar's approver workflow. */}
      <ReminderModal
        open={reminderOpen}
        task={reminderTask}
        submissionRef={sub.ref}
        recipientName={recipient}
        configured={!!sentAt}
        onClose={() => setReminderOpen(false)}
        onSave={() => { onSendReminder({ toName: recipient, channel: 'Email + In-app' }); setSentAt(new Date().toISOString()); setReminderOpen(false); }}
      />
    </div>
  );
}

function BellIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ProductBadge({ productLabel }: { productLabel: string }) {
  const code =
    productLabel === 'LPG' ? 'LPG' :
    productLabel === 'Gasoline' || productLabel === 'Gasoline (98)' ? 'GAS' :
    productLabel === 'Diesel' ? 'DSL' :
    productLabel === 'CNG' ? 'CNG' :
    productLabel.slice(0, 3).toUpperCase();
  return (
    <div className="w-9 h-9 rounded-md bg-action-orange-soft text-action-orange-deep grid place-items-center font-mono font-bold text-[10px] flex-shrink-0">
      {code}
    </div>
  );
}

// StatusPill is now imported from ../../components/pps/StatusPill — single source of truth.

function daysOverdue(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 3600 * 1000)));
}

// "Overdue" is a dynamic, due-date-driven filter (not a workflow status). A record
// is overdue when it is still awaiting entity action — a Draft or a "Returned for
// Clarification" submission — AND its due date has passed. The annual submission
// deadline is 30 Apr of the year following the cycle year (matches the Action
// Required cards, where the 2025 annual is due 30 Apr 2026). Records keep their
// real status badge; this only surfaces them.
function isOverdueSubmission(s: Submission) {
  if (s.status !== 'draft' && s.status !== 'returned') return false;
  const due = new Date(`${s.cycleYear + 1}-04-30T00:00:00Z`).getTime();
  return Date.now() > due;
}
function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000)));
}

function SearchIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function DownloadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function EyeIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }

// Row overflow (⋯) menu — a compact click-to-open context menu anchored directly
// below the icon (Azure / M365 / Jira style). Actions are role + status driven:
//  • Entity submitter (Ahmed): Download PDF, Edit submission (non-approved),
//    Delete draft (drafts only).
//  • Internal user (Omar · approver): view-only actions — View Submission,
//    Review Comments, Download PDF, Audit History. Never edit/delete/re-submit.
function RowActionsMenu({ status, internal, onView, onDownloadPdf, onEdit, onDelete }: {
  status: SubmissionStatus;
  internal?: boolean;
  onView: () => void;
  onDownloadPdf: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const WIDTH = 190;

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setCoords({ top: r.bottom + 4, left: r.right - WIDTH });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onScrollResize() { setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
    };
  }, [open]);

  const showEdit = status !== 'approved';   // Approved & Published → Download PDF only
  const showDelete = status === 'draft';     // Delete draft → drafts only

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        className={cn('w-7 h-7 grid place-items-center rounded-md text-[15px] leading-none transition', open ? 'bg-neutral-100 text-ink-950' : 'hover:bg-neutral-100')}
      >⋯</button>
      {/* Portaled to body with fixed positioning so the menu escapes the table
          card's `overflow-hidden` clipping (esp. on the bottom rows). */}
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: WIDTH }}
          className="bg-white rounded-lg shadow-doe-lg border border-neutral-100 py-2 z-[60]"
        >
          {internal ? (
            <>
              <RowMenuItem icon={<MenuEyeIcon />} label="View Submission" onClick={() => { onView(); setOpen(false); }} />
              <RowMenuItem icon={<MenuCommentIcon />} label="Review Comments" onClick={() => { onView(); setOpen(false); }} />
              <RowMenuItem icon={<MenuDownloadIcon />} label="Download PDF" onClick={() => { onDownloadPdf(); setOpen(false); }} />
              <RowMenuItem icon={<MenuClockIcon />} label="Audit History" onClick={() => { onView(); setOpen(false); }} />
            </>
          ) : (
            <>
              <RowMenuItem icon={<MenuDownloadIcon />} label="Download PDF" onClick={() => { onDownloadPdf(); setOpen(false); }} />
              {showEdit && <RowMenuItem icon={<MenuEditIcon />} label="Edit submission" onClick={() => { onEdit(); setOpen(false); }} />}
              {showDelete && <RowMenuItem icon={<MenuTrashIcon />} label="Delete draft" danger onClick={() => { onDelete(); setOpen(false); }} />}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

function RowMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-left transition',
        danger ? 'text-danger-500 hover:bg-danger-soft/40' : 'text-ink-950 hover:bg-neutral-50')}
    >
      <span className={cn('flex-shrink-0', danger ? 'text-danger-500' : 'text-neutral-500')}>{icon}</span>
      {label}
    </button>
  );
}

function MenuDownloadIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>; }
function MenuEditIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function MenuTrashIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>; }
function MenuEyeIcon()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function MenuCommentIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>; }
function MenuClockIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }

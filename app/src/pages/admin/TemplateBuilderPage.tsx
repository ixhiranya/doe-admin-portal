import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useTemplates } from '../../store/templates';
import { useAuth } from '../../store/auth';
import { useFormulas } from '../../store/formulas';
import { FIELD_PALETTE, DATA_TYPES, UNIT_OPTIONS } from '../../data/templateDefaults';
import { ALL_COMPANIES, ALL_PRODUCTS, ALL_TEMPLATES, COMPANY_OPTIONS, PRODUCT_OPTIONS } from '../../data/adminFilters';
import type { PaletteField, TemplateField, TemplateSection, SubmissionTemplate } from '../../types/templates';
import { cn } from '../../lib/utils';

// Drag payload tags carried in dataTransfer so drop handlers know what's
// being dragged: a fresh field from the palette, an existing field being
// reordered/moved between sections, or a whole section being reordered.
const DT_PALETTE = 'application/x-palette-field';
const DT_FIELD = 'application/x-template-field';
const DT_SECTION = 'application/x-template-section';

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const isViewMode = params.get('mode') === 'view';
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const getById = useTemplates((s) => s.getById);
  const saveDraft = useTemplates((s) => s.saveDraft);
  const publishVersion = useTemplates((s) => s.publishVersion);
  const beginEdit = useTemplates((s) => s.beginEdit);
  const allTemplates = useTemplates((s) => s.templates);
  const formulas = useFormulas((s) => s.formulas);
  const addFormula = useFormulas((s) => s.addFormula);

  const stored = id ? getById(id) : undefined;

  const [name, setName] = useState(stored?.name ?? '');
  const [code, setCode] = useState(stored?.code ?? '');
  const [sections, setSections] = useState<TemplateSection[]>(stored?.sections ?? []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((stored?.sections ?? []).map((s, i) => [s.id, i === 0])),
  );
  const [selected, setSelected] = useState<{ sectionId: string; fieldId: string } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [customPalette, setCustomPalette] = useState<PaletteField[]>([]);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [showCreateField, setShowCreateField] = useState(false);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dragOverFieldId, setDragOverFieldId] = useState<string | null>(null);

  // Field Palette filters — Company / Product / Template. Selecting a
  // specific template swaps the palette over to that template's own fields
  // (reuse an existing field definition instead of a generic measure).
  const [paletteCompany, setPaletteCompany] = useState(ALL_COMPANIES);
  const [paletteProduct, setPaletteProduct] = useState(ALL_PRODUCTS);
  const [paletteTemplateId, setPaletteTemplateId] = useState('all');

  // Formula picker filters — same idea, scoped to the Formula Master list
  // plus a "fields in this template" reference panel for building expressions.
  const [formulaCompany, setFormulaCompany] = useState(ALL_COMPANIES);
  const [formulaProduct, setFormulaProduct] = useState(ALL_PRODUCTS);
  const [formulaTemplateId, setFormulaTemplateId] = useState('all');
  const [showCreateFormula, setShowCreateFormula] = useState(false);

  const initialSnapshot = useRef(JSON.stringify({ name: stored?.name, code: stored?.code, sections: stored?.sections }));

  // One row per template family, taking the highest version — used to
  // populate the "Template" filters in both the field palette and the
  // formula picker ("all templates with latest version"). These must be
  // computed unconditionally (before the early-return guard below) since
  // they're hooks.
  const latestTemplates = useMemo(() => {
    const byFamily = new Map<string, SubmissionTemplate>();
    for (const t of allTemplates) {
      const cur = byFamily.get(t.familyId);
      if (!cur || t.version > cur.version) byFamily.set(t.familyId, t);
    }
    return [...byFamily.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allTemplates]);

  const paletteTemplateOptions = useMemo(() => latestTemplates.filter((t) =>
    (paletteCompany === ALL_COMPANIES || t.company === paletteCompany) &&
    (paletteProduct === ALL_PRODUCTS || t.product === paletteProduct),
  ), [latestTemplates, paletteCompany, paletteProduct]);

  const formulaTemplateOptions = useMemo(() => latestTemplates.filter((t) =>
    (formulaCompany === ALL_COMPANIES || t.company === formulaCompany) &&
    (formulaProduct === ALL_PRODUCTS || t.product === formulaProduct),
  ), [latestTemplates, formulaCompany, formulaProduct]);

  useEffect(() => {
    if (!stored) return;
    setName(stored.name);
    setCode(stored.code);
    setSections(stored.sections);
    setExpanded(Object.fromEntries(stored.sections.map((s, i) => [s.id, i === 0])));
    initialSnapshot.current = JSON.stringify({ name: stored.name, code: stored.code, sections: stored.sections });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id || !stored) {
    return (
      <div className="max-w-[900px] mx-auto px-6 pt-10 text-center">
        <p className="text-neutral-500 mb-4">This template couldn't be found — it may have been deleted.</p>
        <Link to="/admin/template-management" className="btn-primary">Back to Template Management</Link>
      </div>
    );
  }

  // TS can't carry the narrowing of `id` from the guard above into closures
  // defined further down (commit, handleSaveDraft, etc.), since those could
  // in principle run later. Re-binding to a fresh const fixes that for good.
  const templateId: string = id;

  const isDirty = JSON.stringify({ name, code, sections }) !== initialSnapshot.current;
  const selectedField = selected ? sections.find((s) => s.id === selected.sectionId)?.fields.find((f) => f.id === selected.fieldId) ?? null : null;

  function updateField(sectionId: string, fieldId: string, patch: Partial<TemplateField>) {
    setSections((secs) => secs.map((s) => s.id !== sectionId ? s : { ...s, fields: s.fields.map((f) => f.id === fieldId ? { ...f, ...patch } : f) }));
  }
  function deleteField(sectionId: string, fieldId: string) {
    setSections((secs) => secs.map((s) => s.id !== sectionId ? s : { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }));
    if (selected?.fieldId === fieldId) setSelected(null);
  }
  function duplicateField(sectionId: string, fieldId: string) {
    setSections((secs) => secs.map((s) => {
      if (s.id !== sectionId) return s;
      const idx = s.fields.findIndex((f) => f.id === fieldId);
      if (idx < 0) return s;
      const copy: TemplateField = { ...s.fields[idx], id: nanoid(8), name: `${s.fields[idx].name} (Copy)`, code: `${s.fields[idx].code}_copy` };
      const fields = [...s.fields]; fields.splice(idx + 1, 0, copy);
      return { ...s, fields };
    }));
  }

  function addSection() {
    const sec: TemplateSection = { id: nanoid(8), title: `${sections.length + 1}. Untitled Section`, fields: [] };
    setSections((s) => [...s, sec]);
    setExpanded((e) => ({ ...e, [sec.id]: true }));
  }
  function deleteSection(sectionId: string) {
    if (!confirm('Delete this section and all its fields?')) return;
    setSections((s) => s.filter((x) => x.id !== sectionId));
  }
  function duplicateSection(sectionId: string) {
    setSections((secs) => {
      const idx = secs.findIndex((s) => s.id === sectionId);
      if (idx < 0) return secs;
      const copy: TemplateSection = { ...secs[idx], id: nanoid(8), title: `${secs[idx].title} (Copy)`, fields: secs[idx].fields.map((f) => ({ ...f, id: nanoid(8) })) };
      const arr = [...secs]; arr.splice(idx + 1, 0, copy);
      return arr;
    });
  }
  function renameSection(sectionId: string, title: string) {
    setSections((secs) => secs.map((s) => s.id === sectionId ? { ...s, title } : s));
  }

  function addPaletteFieldToSection(sectionId: string, pf: PaletteField, beforeFieldId?: string) {
    const newField: TemplateField = {
      id: nanoid(8), name: pf.name, code: pf.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      dataType: pf.dataType, unit: pf.unit, kind: 'Manual', mandatory: false, readOnly: false, required: false,
    };
    setSections((secs) => secs.map((s) => {
      if (s.id !== sectionId) return s;
      const fields = [...s.fields];
      if (beforeFieldId) {
        const idx = fields.findIndex((f) => f.id === beforeFieldId);
        fields.splice(idx < 0 ? fields.length : idx, 0, newField);
      } else fields.push(newField);
      return { ...s, fields };
    }));
    setSelected({ sectionId, fieldId: newField.id });
  }

  function moveFieldToSection(fromSectionId: string, fieldId: string, toSectionId: string, beforeFieldId?: string) {
    setSections((secs) => {
      const fromSec = secs.find((s) => s.id === fromSectionId);
      const field = fromSec?.fields.find((f) => f.id === fieldId);
      if (!field) return secs;
      if (fromSectionId === toSectionId) {
        const idx = fromSec!.fields.findIndex((f) => f.id === fieldId);
        let toIdx = beforeFieldId ? fromSec!.fields.findIndex((f) => f.id === beforeFieldId) : fromSec!.fields.length - 1;
        if (idx < 0 || toIdx < 0) return secs;
        if (toIdx > idx) toIdx -= 1; // account for the index shift once the dragged item is removed
        return secs.map((s) => s.id === fromSectionId ? { ...s, fields: moveItem(s.fields, idx, toIdx) } : s);
      }
      return secs.map((s) => {
        if (s.id === fromSectionId) return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) };
        if (s.id === toSectionId) {
          const fields = [...s.fields];
          if (beforeFieldId) {
            const idx = fields.findIndex((f) => f.id === beforeFieldId);
            fields.splice(idx < 0 ? fields.length : idx, 0, field);
          } else fields.push(field);
          return { ...s, fields };
        }
        return s;
      });
    });
    setSelected({ sectionId: toSectionId, fieldId });
  }

  function moveSectionDrop(draggedId: string, beforeId: string) {
    setSections((secs) => {
      const from = secs.findIndex((s) => s.id === draggedId);
      const to = secs.findIndex((s) => s.id === beforeId);
      if (from < 0 || to < 0 || from === to) return secs;
      return moveItem(secs, from, to);
    });
  }

  function commit(): boolean {
    if (!name.trim() || !code.trim()) { alert('Template Name and Template Code are required.'); return false; }
    saveDraft(templateId, { name, code, sections });
    setLastSavedAt(new Date());
    initialSnapshot.current = JSON.stringify({ name, code, sections });
    return true;
  }

  function handleSaveDraft() { if (commit()) { /* stay in builder */ } }
  function handlePublish() {
    if (!commit()) return;
    publishVersion(templateId);
    navigate('/admin/template-management');
  }
  function handleCancel() {
    if (isDirty && !confirm('Discard unsaved changes?')) return;
    navigate('/admin/template-management');
  }
  function handleStartEditing() {
    const editId = beginEdit(templateId, user?.name ?? 'DoE Admin');
    navigate(`/admin/template-management/${editId}/builder`);
  }

  function fieldsOfTemplate(t: SubmissionTemplate | undefined): TemplateField[] {
    if (!t) return [];
    const seen = new Set<string>();
    const list: TemplateField[] = [];
    for (const sec of t.sections) for (const f of sec.fields) {
      if (!seen.has(f.code)) { seen.add(f.code); list.push(f); }
    }
    return list;
  }

  // ── Field Palette: Company / Product narrow the Template dropdown; picking
  // a specific template swaps the palette to show that template's fields.
  const selectedPaletteTemplate = paletteTemplateOptions.find((t) => t.id === paletteTemplateId);
  const allPalette = [...FIELD_PALETTE, ...customPalette];
  const basePaletteItems: PaletteField[] = selectedPaletteTemplate
    ? fieldsOfTemplate(selectedPaletteTemplate).map((f) => ({ id: f.id, name: f.name, dataType: f.dataType, unit: f.unit }))
    : allPalette;
  const filteredPalette = basePaletteItems.filter((p) => p.name.toLowerCase().includes(paletteSearch.toLowerCase()));

  // ── Formula picker: Company / Product filter the Formula Master list;
  // Template filter (separately) only drives the "fields in this template"
  // reference panel used while building an expression.
  const filteredFormulas = formulas.filter((f) =>
    (formulaCompany === ALL_COMPANIES || f.company === ALL_COMPANIES || f.company === formulaCompany) &&
    (formulaProduct === ALL_PRODUCTS || f.product === ALL_PRODUCTS || f.product === formulaProduct),
  );
  const selectedFormulaTemplate = formulaTemplateOptions.find((t) => t.id === formulaTemplateId);
  const formulaReferenceFields = fieldsOfTemplate(selectedFormulaTemplate);

  return (
    <div className="max-w-[1600px] mx-auto px-6 pt-5 pb-10">
      <nav className="text-[12px] text-neutral-500 mb-3">
        <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <Link to="/admin/template-management" className="hover:text-doe-red">Template Management</Link>
        <span className="mx-2 text-neutral-300">›</span>
        <span className="text-ink-950 font-semibold">Template Builder</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-[24px] text-ink-950">Template Builder</h1>
          <p className="text-[12.5px] text-neutral-500 mt-1">Design and configure submission templates.</p>
        </div>
        <div className="flex items-center gap-2">
          {isViewMode ? (
            <>
              {stored.status === 'Draft' && <button className="btn-primary" onClick={handleStartEditing}>Edit this Draft</button>}
              {stored.status !== 'Draft' && <button className="btn-primary" onClick={handleStartEditing}>Create New Version</button>}
              <button className="btn-secondary" onClick={() => navigate('/admin/template-management')}>Close</button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setShowPreview(true)}><EyeIcon /> Preview</button>
              <button className="btn-secondary" onClick={handleSaveDraft}><SaveIcon /> Save Draft</button>
              <button className="btn-primary" onClick={handlePublish}>Publish Version</button>
              <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
            </>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="card p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="field-label">Template Name</label>
          <input disabled={isViewMode} value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
        </div>
        <div>
          <label className="field-label">Template Code</label>
          <input disabled={isViewMode} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="field-input font-mono" />
        </div>
        <div>
          <label className="field-label">Version</label>
          <div className="h-[38px] flex items-center"><span className="chip-sm bg-info-soft text-info-500 normal-case text-[12px] px-2.5 py-1">v{stored.version}{stored.status === 'Draft' ? ' (Draft)' : ''}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="field-label">Status</label>
            <span className={cn('chip-sm normal-case text-[12px] px-2.5 py-1', stored.status === 'Published' ? 'bg-success-soft text-success-500' : stored.status === 'Draft' ? 'bg-warning-soft text-warning-500' : 'bg-neutral-100 text-neutral-500')}>{stored.status}</span>
          </div>
          {lastSavedAt && <span className="text-[11.5px] text-success-500 flex items-center gap-1 mt-4"><CheckIcon /> Last saved: {lastSavedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr_320px] gap-4 items-start">
        {/* ── Left: Templates browser + Field Palette ── */}
        {!isViewMode && (
          <div className="space-y-4 sticky top-[76px]">
            <div className="card p-3">
              <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 mb-2 px-1">Field Palette</div>

              <div className="space-y-1.5 mb-2">
                <select
                  value={paletteCompany}
                  onChange={(e) => { setPaletteCompany(e.target.value); setPaletteTemplateId('all'); }}
                  className="w-full h-7 px-2 text-[11px] border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:border-action-orange"
                >
                  <option value={ALL_COMPANIES}>{ALL_COMPANIES}</option>
                  {COMPANY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={paletteProduct}
                  onChange={(e) => { setPaletteProduct(e.target.value); setPaletteTemplateId('all'); }}
                  className="w-full h-7 px-2 text-[11px] border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:border-action-orange"
                >
                  <option value={ALL_PRODUCTS}>{ALL_PRODUCTS}</option>
                  {PRODUCT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                  value={paletteTemplateOptions.some((t) => t.id === paletteTemplateId) ? paletteTemplateId : 'all'}
                  onChange={(e) => setPaletteTemplateId(e.target.value)}
                  className="w-full h-7 px-2 text-[11px] border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:border-action-orange"
                >
                  <option value="all">{ALL_TEMPLATES}</option>
                  {paletteTemplateOptions.map((t) => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}
                </select>
              </div>

              {selectedPaletteTemplate && (
                <div className="flex items-center justify-between gap-2 mb-2 px-2 py-1.5 rounded-md bg-info-soft text-info-500 text-[10.5px]">
                  <span className="truncate">Showing fields from <b>{selectedPaletteTemplate.name}</b></span>
                  <button onClick={() => setPaletteTemplateId('all')} className="flex-shrink-0 hover:opacity-70">✕</button>
                </div>
              )}

              <div className="relative mb-2">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"><SearchIcon /></span>
                <input value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} placeholder="Search fields..." className="w-full h-8 pl-8 pr-2 bg-neutral-50 border border-neutral-200 rounded-md text-[12px] focus:outline-none focus:border-action-orange" />
              </div>
              {!selectedPaletteTemplate && (
                <>
                  <button onClick={() => setShowCreateField((v) => !v)} className="w-full btn-secondary h-8 text-[11.5px] mb-2"><PlusIcon /> Create Field</button>
                  {showCreateField && (
                    <CreateFieldForm onCreate={(pf) => { setCustomPalette((c) => [pf, ...c]); setShowCreateField(false); }} onClose={() => setShowCreateField(false)} />
                  )}
                </>
              )}
              <div className="max-h-[420px] overflow-y-auto space-y-1 pr-0.5">
                {filteredPalette.map((pf) => (
                  <div
                    key={pf.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData(DT_PALETTE, JSON.stringify(pf)); e.dataTransfer.effectAllowed = 'copy'; }}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-neutral-100 bg-neutral-25 hover:border-action-orange hover:bg-action-orange-soft cursor-grab active:cursor-grabbing transition text-[12px]"
                    title="Drag into a section"
                  >
                    <span className="w-5 h-5 rounded bg-white border border-neutral-200 grid place-items-center text-[10px] font-mono font-bold text-neutral-500 flex-shrink-0">#</span>
                    <span className="text-ink-950 font-medium truncate">{pf.name}{pf.unit ? <span className="text-neutral-400 font-normal"> ({pf.unit})</span> : ''}</span>
                  </div>
                ))}
                {filteredPalette.length === 0 && <div className="text-[12px] text-neutral-400 text-center py-4">No matching fields.</div>}
              </div>
              <p className="text-[10.5px] text-neutral-400 mt-2 px-0.5">Drag fields to add to sections</p>
            </div>
          </div>
        )}


        {/* ── Center: Sections canvas ── */}
        <div className={cn('space-y-2', isViewMode && 'col-span-2')}>
          {sections.map((sec) => (
            <div
              key={sec.id}
              onDragOver={(e) => { if (!isViewMode) { e.preventDefault(); setDragOverSectionId(sec.id); } }}
              onDrop={(e) => {
                if (isViewMode) return;
                const sectionId = e.dataTransfer.getData(DT_SECTION);
                if (sectionId && sectionId !== sec.id) moveSectionDrop(sectionId, sec.id);
                setDragOverSectionId(null);
              }}
              className={cn('card overflow-hidden transition', dragOverSectionId === sec.id && 'ring-2 ring-action-orange')}
            >
              {/* Section header */}
              <div
                draggable={!isViewMode}
                onDragStart={(e) => { e.dataTransfer.setData(DT_SECTION, sec.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => setDragOverSectionId(null)}
                className="flex items-center gap-2 px-3 py-2.5 bg-neutral-25 border-b border-neutral-100"
              >
                {!isViewMode && <span className="text-neutral-300 cursor-grab active:cursor-grabbing"><DragHandleIcon /></span>}
                <button onClick={() => setExpanded((e) => ({ ...e, [sec.id]: !e[sec.id] }))} className="text-neutral-500">
                  <ChevronIcon open={!!expanded[sec.id]} />
                </button>
                {isViewMode ? (
                  <span className="flex-1 text-[13.5px] font-semibold text-ink-950">{sec.title}</span>
                ) : (
                  <input
                    value={sec.title}
                    onChange={(e) => renameSection(sec.id, e.target.value)}
                    className="flex-1 bg-transparent text-[13.5px] font-semibold text-ink-950 outline-none focus:bg-white focus:border focus:border-action-orange rounded px-1 -mx-1"
                  />
                )}
                <span className="text-[11px] text-neutral-400 mr-1">{sec.fields.length} field{sec.fields.length === 1 ? '' : 's'}</span>
                {!isViewMode && (
                  <div className="flex items-center gap-0.5">
                    <IconBtn title="Add field" onClick={() => addPaletteFieldToSection(sec.id, { id: nanoid(6), name: 'New Field', dataType: 'Text' })}><PlusIcon /></IconBtn>
                    <IconBtn title="Duplicate section" onClick={() => duplicateSection(sec.id)}><CopyIcon /></IconBtn>
                    <IconBtn title="Delete section" tone="danger" onClick={() => deleteSection(sec.id)}><TrashIcon /></IconBtn>
                  </div>
                )}
              </div>

              {/* Fields */}
              {expanded[sec.id] && (
                <div
                  onDragOver={(e) => { if (!isViewMode) e.preventDefault(); }}
                  onDrop={(e) => {
                    if (isViewMode) return;
                    e.stopPropagation();
                    const paletteRaw = e.dataTransfer.getData(DT_PALETTE);
                    const fieldRaw = e.dataTransfer.getData(DT_FIELD);
                    if (paletteRaw) addPaletteFieldToSection(sec.id, JSON.parse(paletteRaw));
                    else if (fieldRaw) { const { sectionId, fieldId } = JSON.parse(fieldRaw); moveFieldToSection(sectionId, fieldId, sec.id); }
                    setDragOverFieldId(null);
                  }}
                  className={cn('p-2', sec.fields.length === 0 && !isViewMode && 'min-h-[64px] flex items-center justify-center')}
                >
                  {sec.fields.length === 0 && !isViewMode && (
                    <div className="text-[12px] text-neutral-400 border-2 border-dashed border-neutral-200 rounded-lg w-full py-5 text-center">Drag fields here from the palette</div>
                  )}
                  {sec.fields.map((f) => (
                    <div
                      key={f.id}
                      draggable={!isViewMode}
                      onDragStart={(e) => { e.dataTransfer.setData(DT_FIELD, JSON.stringify({ sectionId: sec.id, fieldId: f.id })); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragOver={(e) => { if (!isViewMode) { e.preventDefault(); e.stopPropagation(); setDragOverFieldId(f.id); } }}
                      onDrop={(e) => {
                        if (isViewMode) return;
                        e.stopPropagation();
                        const paletteRaw = e.dataTransfer.getData(DT_PALETTE);
                        const fieldRaw = e.dataTransfer.getData(DT_FIELD);
                        if (paletteRaw) addPaletteFieldToSection(sec.id, JSON.parse(paletteRaw), f.id);
                        else if (fieldRaw) { const { sectionId, fieldId } = JSON.parse(fieldRaw); if (fieldId !== f.id) moveFieldToSection(sectionId, fieldId, sec.id, f.id); }
                        setDragOverFieldId(null);
                      }}
                      onClick={() => setSelected({ sectionId: sec.id, fieldId: f.id })}
                      className={cn(
                        'group flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer transition mb-0.5',
                        selected?.fieldId === f.id ? 'bg-action-orange-soft' : 'hover:bg-neutral-50',
                        dragOverFieldId === f.id && 'border-t-2 border-action-orange',
                      )}
                    >
                      {!isViewMode && <span className="text-neutral-300 cursor-grab active:cursor-grabbing"><DragHandleIcon /></span>}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-ink-950 truncate">{f.name}{f.mandatory && <span className="text-danger-500"> *</span>}</div>
                        <div className="text-[11px] text-neutral-400 font-mono truncate">{f.code}</div>
                      </div>
                      <span className="chip-sm bg-info-soft text-info-500 normal-case flex-shrink-0">{f.dataType}</span>
                      {f.required && <span className="chip-sm bg-danger-soft text-danger-500 normal-case flex-shrink-0">Required</span>}
                      {!isViewMode && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          <IconBtn title="Duplicate" onClick={(e) => { e?.stopPropagation(); duplicateField(sec.id, f.id); }}><CopyIcon /></IconBtn>
                          <IconBtn title="Delete" tone="danger" onClick={(e) => { e?.stopPropagation(); deleteField(sec.id, f.id); }}><TrashIcon /></IconBtn>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!isViewMode && (
            <button onClick={addSection} className="w-full card border-dashed py-3 text-[13px] font-semibold text-neutral-500 hover:text-action-orange-deep hover:border-action-orange flex items-center justify-center gap-2">
              <PlusIcon /> Add Section
            </button>
          )}
        </div>

        {/* ── Right: Field properties ── */}
        {!isViewMode && (
          <div className="card p-4 sticky top-[76px]">
            <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 mb-3">Field Properties</div>
            {!selectedField ? (
              <p className="text-[12.5px] text-neutral-400 py-8 text-center">Select a field to edit its properties.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="field-label">Field Name *</label>
                  <input value={selectedField.name} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { name: e.target.value })} className="field-input" />
                </div>
                <div>
                  <label className="field-label">Field Code *</label>
                  <input value={selectedField.code} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { code: e.target.value })} className="field-input font-mono" />
                </div>
                <div>
                  <label className="field-label">Data Type *</label>
                  <select value={selectedField.dataType} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { dataType: e.target.value as TemplateField['dataType'] })} className="field-input">
                    {DATA_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Unit</label>
                  <select value={selectedField.unit ?? ''} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { unit: e.target.value || undefined })} className="field-input">
                    <option value="">—</option>
                    {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Kind *</label>
                  <select value={selectedField.kind} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { kind: e.target.value as TemplateField['kind'] })} className="field-input">
                    <option value="Manual">Manual</option>
                    <option value="Calculated">Calculated</option>
                    <option value="System">System</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <Checkbox label="Mandatory" checked={selectedField.mandatory} onChange={(v) => updateField(selected!.sectionId, selected!.fieldId, { mandatory: v })} />
                  <Checkbox label="Read Only" checked={selectedField.readOnly} onChange={(v) => updateField(selected!.sectionId, selected!.fieldId, { readOnly: v })} />
                  <Checkbox label="Required" checked={selectedField.required} onChange={(v) => updateField(selected!.sectionId, selected!.fieldId, { required: v })} />
                </div>
                {selectedField.kind === 'Calculated' && (
                  <div className="border-t border-neutral-100 pt-3 space-y-2.5">
                    <label className="field-label mb-0">Formula Expression</label>
                    <div className="relative">
                      <input value={selectedField.formulaExpression ?? ''} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { formulaExpression: e.target.value })} className="field-input pr-8 font-mono" placeholder="e.g. imports + local_production" />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-neutral-400">fx</span>
                    </div>

                    <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 pt-1">Pick from Formula Master</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select value={formulaCompany} onChange={(e) => { setFormulaCompany(e.target.value); setFormulaTemplateId('all'); }} className="h-7 px-1.5 text-[11px] border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-action-orange">
                        <option value={ALL_COMPANIES}>{ALL_COMPANIES}</option>
                        {COMPANY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={formulaProduct} onChange={(e) => { setFormulaProduct(e.target.value); setFormulaTemplateId('all'); }} className="h-7 px-1.5 text-[11px] border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-action-orange">
                        <option value={ALL_PRODUCTS}>{ALL_PRODUCTS}</option>
                        {PRODUCT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <select value={formulaTemplateOptions.some((t) => t.id === formulaTemplateId) ? formulaTemplateId : 'all'} onChange={(e) => setFormulaTemplateId(e.target.value)} className="w-full h-7 px-1.5 text-[11px] border border-neutral-200 rounded-md bg-white focus:outline-none focus:border-action-orange">
                      <option value="all">{ALL_TEMPLATES}</option>
                      {formulaTemplateOptions.map((t) => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}
                    </select>

                    <div className="max-h-[160px] overflow-y-auto space-y-1">
                      {filteredFormulas.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateField(selected!.sectionId, selected!.fieldId, { formulaExpression: f.expression })}
                          className="w-full text-left px-2.5 py-1.5 rounded-md border border-neutral-100 bg-neutral-25 hover:border-action-orange hover:bg-action-orange-soft transition"
                          title={f.description}
                        >
                          <div className="text-[11.5px] font-semibold text-ink-950">{f.name}</div>
                          <div className="text-[10.5px] font-mono text-neutral-500 truncate">{f.expression}</div>
                        </button>
                      ))}
                      {filteredFormulas.length === 0 && <div className="text-[11px] text-neutral-400 text-center py-3">No formulas match these filters.</div>}
                    </div>

                    {selectedFormulaTemplate && formulaReferenceFields.length > 0 && (
                      <div>
                        <div className="text-[10px] font-sans uppercase tracking-wider text-neutral-500 mb-1">Fields in {selectedFormulaTemplate.name} <span className="normal-case text-neutral-400">(click to insert)</span></div>
                        <div className="flex flex-wrap gap-1">
                          {formulaReferenceFields.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => updateField(selected!.sectionId, selected!.fieldId, { formulaExpression: `${selectedField.formulaExpression ? selectedField.formulaExpression + ' ' : ''}${f.code}` })}
                              className="chip-sm bg-neutral-100 text-neutral-600 normal-case font-mono hover:bg-action-orange-soft hover:text-action-orange-deep transition"
                            >
                              {f.code}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* {!showCreateFormula ? (
                      <button type="button" onClick={() => setShowCreateFormula(true)} className="w-full btn-secondary h-8 text-[11.5px]"><PlusIcon /> Create New Formula</button>
                    ) : (
                      <CreateFormulaForm
                        onClose={() => setShowCreateFormula(false)}
                        onCreate={(input) => {
                          const f = addFormula(input);
                          updateField(selected!.sectionId, selected!.fieldId, { formulaExpression: f.expression });
                          setShowCreateFormula(false);
                        }}
                      />
                    )} */}
                    <button
                      type="button"
                      onClick={() => navigate("/admin/formula-configuration")}
                      className="w-full btn-secondary h-8 text-[11.5px]"
                    >
                      <PlusIcon /> Create Formula
                    </button>
                  </div>
                )}
                <div>
                  <label className="field-label">Default Value</label>
                  <input value={selectedField.defaultValue ?? ''} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { defaultValue: e.target.value })} className="field-input" placeholder="Enter default value" />
                </div>
                <div>
                  <label className="field-label">Help Text</label>
                  <textarea value={selectedField.helpText ?? ''} onChange={(e) => updateField(selected!.sectionId, selected!.fieldId, { helpText: e.target.value })} className="field-input min-h-[70px] resize-y" placeholder="Enter help text" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showPreview && <PreviewModal name={name} code={code} sections={sections} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

// ============================================================ Create custom formula form (mini)

function CreateFormulaForm({ onCreate, onClose }: { onCreate: (input: { name: string; expression: string; company: string; product: string }) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [expression, setExpression] = useState('');
  const [company, setCompany] = useState(ALL_COMPANIES);
  const [product, setProduct] = useState(ALL_PRODUCTS);
  const valid = name.trim() && expression.trim();
  return (
    <div className="border border-neutral-200 rounded-lg p-2.5 space-y-2 bg-neutral-25">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Formula name" className="w-full h-7 px-2 text-[12px] bg-white border border-neutral-200 rounded outline-none focus:border-action-orange" />
      <textarea value={expression} onChange={(e) => setExpression(e.target.value)} placeholder="e.g. imports + local_production" className="w-full min-h-[50px] px-2 py-1.5 text-[11.5px] font-mono bg-white border border-neutral-200 rounded outline-none focus:border-action-orange resize-y" />
      <div className="flex gap-1.5">
        <select value={company} onChange={(e) => setCompany(e.target.value)} className="flex-1 h-7 px-1.5 text-[11px] bg-white border border-neutral-200 rounded outline-none">
          <option value={ALL_COMPANIES}>{ALL_COMPANIES}</option>
          {COMPANY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={product} onChange={(e) => setProduct(e.target.value)} className="flex-1 h-7 px-1.5 text-[11px] bg-white border border-neutral-200 rounded outline-none">
          <option value={ALL_PRODUCTS}>{ALL_PRODUCTS}</option>
          {PRODUCT_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="text-[11px] px-2 py-1 rounded text-neutral-500 hover:bg-neutral-100">Cancel</button>
        <button
          disabled={!valid}
          onClick={() => onCreate({ name: name.trim(), expression: expression.trim(), company, product })}
          className="text-[11px] px-2 py-1 rounded bg-action-orange text-white font-semibold disabled:opacity-40"
        >Save Formula</button>
      </div>
    </div>
  );
}

// ============================================================ Create custom field form (mini)

function CreateFieldForm({ onCreate, onClose }: { onCreate: (pf: PaletteField) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState<PaletteField['dataType']>('Text');
  const [unit, setUnit] = useState('');
  return (
    <div className="border border-neutral-200 rounded-lg p-2.5 mb-2 space-y-2 bg-neutral-25">
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Field name" className="w-full h-7 px-2 text-[12px] bg-white border border-neutral-200 rounded outline-none focus:border-action-orange" />
      <div className="flex gap-1.5">
        <select value={dataType} onChange={(e) => setDataType(e.target.value as PaletteField['dataType'])} className="flex-1 h-7 px-1.5 text-[11.5px] bg-white border border-neutral-200 rounded outline-none">
          {DATA_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (opt.)" className="w-20 h-7 px-1.5 text-[11.5px] bg-white border border-neutral-200 rounded outline-none" />
      </div>
      <div className="flex gap-1.5 justify-end">
        <button onClick={onClose} className="text-[11px] px-2 py-1 rounded text-neutral-500 hover:bg-neutral-100">Cancel</button>
        <button
          disabled={!name.trim()}
          onClick={() => onCreate({ id: nanoid(6), name: name.trim(), dataType, unit: unit.trim() || undefined })}
          className="text-[11px] px-2 py-1 rounded bg-action-orange text-white font-semibold disabled:opacity-40"
        >Add to palette</button>
      </div>
    </div>
  );
}

// ============================================================ Preview modal

function PreviewModal({ name, code, sections, onClose }: { name: string; code: string; sections: TemplateSection[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-ink-950/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-doe-xl max-w-[720px] w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-display text-[16px] font-bold text-ink-950">{name || 'Untitled Template'}</h3>
            <p className="text-[11.5px] text-neutral-500 font-mono">{code}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 grid place-items-center rounded-md text-neutral-500 hover:text-ink-950 hover:bg-neutral-50">✕</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5">
          {sections.map((sec) => (
            <div key={sec.id}>
              <div className="text-[13px] font-semibold text-ink-950 mb-2 pb-1.5 border-b border-neutral-100">{sec.title}</div>
              {sec.fields.length === 0 ? (
                <p className="text-[12px] text-neutral-400 italic">No fields in this section.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {sec.fields.map((f) => (
                    <div key={f.id}>
                      <label className="field-label">{f.name}{f.mandatory && <span className="text-danger-500"> *</span>}{f.unit && <span className="normal-case text-neutral-400"> ({f.unit})</span>}</label>
                      {f.dataType === 'Textarea' ? (
                        <textarea disabled placeholder={f.helpText || '—'} className="field-input min-h-[54px]" />
                      ) : (
                        <input disabled type={f.dataType === 'Number' || f.dataType === 'Year' ? 'number' : f.dataType === 'Date' ? 'date' : 'text'} placeholder={f.defaultValue || f.helpText || '—'} className="field-input" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================ small pieces

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] text-ink-950 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-neutral-300 accent-action-orange" />
      {label}
    </label>
  );
}

function IconBtn({ children, onClick, title, tone }: { children: React.ReactNode; onClick: (e?: React.MouseEvent) => void; title: string; tone?: 'danger' }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn('w-6 h-6 grid place-items-center rounded transition', tone === 'danger' ? 'text-danger-500 hover:bg-danger-soft' : 'text-neutral-400 hover:bg-neutral-100 hover:text-ink-950')}
    >
      {children}
    </button>
  );
}

// ============================================================ icons
function PlusIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>; }
function SearchIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>; }
function CopyIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>; }
function TrashIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>; }
function EyeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>; }
function SaveIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>; }
function CheckIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>; }
function ChevronIcon({ open }: { open: boolean }) { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={cn('transition-transform', open && 'rotate-90')}><polyline points="9 18 15 12 9 6" /></svg>; }
function DragHandleIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5" /><circle cx="8" cy="12" r="1.5" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="6" r="1.5" /><circle cx="16" cy="12" r="1.5" /><circle cx="16" cy="18" r="1.5" /></svg>; }

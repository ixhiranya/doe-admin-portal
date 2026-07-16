import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import type {
  Application,
  AttachmentRef,
  ReferenceProject,
  TechnicalStaff,
} from '../types';
import { useAuth } from '../store/auth';
import { useApps } from '../store/apps';
import { getService } from '../services/registry';
import { Accordion } from '../components/Accordion';
import { AttachmentBox } from '../components/AttachmentBox';
import { PageHeader } from '../components/PageHeader';

export function ApplicationFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const params = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;
  const apps = useApps((s) => s.apps);
  const saveApp = useApps((s) => s.saveApp);
  const createDraft = useApps((s) => s.createDraft);
  const runTransition = useApps((s) => s.runTransition);

  const svc = useMemo(() => {
    if (mode === 'create') return getService(`${params.module}.${params.action}` as any);
    const existing = apps.find((a) => a.id === params.appId);
    return existing ? getService(existing.serviceId) : undefined;
  }, [mode, params, apps]);

  // Ensure draft exists when creating
  const [appId, setAppId] = useState<string | null>(mode === 'edit' ? params.appId ?? null : null);
  useEffect(() => {
    if (mode === 'create' && !appId && svc) {
      const created = createDraft(svc.id, user);
      setAppId(created.id);
    }
  }, [mode, appId, svc, createDraft, user]);

  const app = appId ? apps.find((a) => a.id === appId) : undefined;
  const [local, setLocal] = useState<Application | undefined>(app);
  useEffect(() => { if (app) setLocal(app); }, [app?.id]);

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitComment, setSubmitComment] = useState('');

  if (!svc || !local) return <div className="p-6">Loading form…</div>;

  const isReadOnly = local.state !== 'draft' && local.state !== 'returned_to_applicant';

  // ---- validation ----
  function validate(): string[] {
    const errs: string[] = [];
    if (!local!.category) errs.push('Pre-qualification Category is required.');
    if (!local!.workshopAddress?.trim()) errs.push('Workshop Address is required.');
    if (!local!.areaOfOperations?.trim()) errs.push('Area of Operations is required.');

    // mandatory company attachments
    const companySection = svc!.form.find((s) => s.id === 'company-info');
    companySection?.attachments?.forEach((att) => {
      const isReq = att.required === true || (typeof att.required === 'object' && local!.category && att.required.whenCategory.includes(local!.category));
      if (!isReq) return;
      if (!local!.attachments.some((f) => f.defId === att.id)) errs.push(`Missing attachment: ${att.label}`);
    });

    // staff minimums
    const staffSection = svc!.form.find((s) => s.id === 'tech-staff');
    if (staffSection?.repeatable && local!.category) {
      const min = typeof staffSection.repeatable.minCount === 'object'
        ? (staffSection.repeatable.minCount as any).fromCategory[local!.category]
        : undefined;
      if (min) {
        const engineers = local!.technicalStaff.filter((s) => s.staffType === 'Engineer').length;
        const technicians = local!.technicalStaff.filter((s) => s.staffType === 'Technician').length;
        if (min.engineers && engineers < min.engineers) errs.push(`Category ${local!.category} requires at least ${min.engineers} Engineers (have ${engineers}).`);
        if (min.technicians && technicians < min.technicians) errs.push(`Category ${local!.category} requires at least ${min.technicians} Technicians (have ${technicians}).`);
      }
    }

    // reference projects for A/B/C
    if (local!.category && ['A', 'B', 'C'].includes(local!.category) && local!.referenceProjects.length === 0) {
      errs.push('At least one Reference Project is required for Categories A, B and C.');
    }

    return errs;
  }

  function handleSave() {
    saveApp(local!);
    navigate(`/app/${local!.id}`);
  }

  function handleSubmit() {
    const errs = validate();
    setErrors(errs);
    if (errs.length > 0) return;
    setSubmitting(true);
    saveApp(local!);
    const result = runTransition(local!.id, 'submit', user, submitComment);
    setSubmitting(false);
    if (!result.ok) {
      setErrors([result.error || 'Submit failed.']);
      return;
    }
    navigate(`/app/${local!.id}`);
  }

  // ---- handlers for staff / projects / attachments ----
  function patch<K extends keyof Application>(k: K, v: Application[K]) {
    setLocal({ ...local!, [k]: v });
  }
  function setAttachments(next: AttachmentRef[]) { patch('attachments', next); }
  function setStaff(next: TechnicalStaff[]) { patch('technicalStaff', next); }
  function setProjects(next: ReferenceProject[]) { patch('referenceProjects', next); }

  // ---- attachments by def id helper ----
  function filesFor(defId: string) {
    return local!.attachments.filter((a) => a.defId === defId);
  }
  function setFilesFor(defId: string, files: AttachmentRef[]) {
    const others = local!.attachments.filter((a) => a.defId !== defId);
    setAttachments([...others, ...files]);
  }

  const companySection = svc.form.find((s) => s.id === 'company-info')!;
  const staffSection = svc.form.find((s) => s.id === 'tech-staff')!;
  const projectsSection = svc.form.find((s) => s.id === 'ref-projects')!;

  const minStaff = local.category && typeof staffSection.repeatable?.minCount === 'object'
    ? (staffSection.repeatable!.minCount as any).fromCategory[local.category]
    : null;
  const engCount = local.technicalStaff.filter((s) => s.staffType === 'Engineer').length;
  const techCount = local.technicalStaff.filter((s) => s.staffType === 'Technician').length;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'PPS', to: '/pps-dashboard' },
          { label: 'Gas Systems', to: `/module/${svc.module}` },
          { label: svc.shortTitle, to: `/module/${svc.module}/${svc.action}` },
          { label: mode === 'create' ? 'New Application' : `Edit ${local.applicationNumber}` },
        ]}
        title={mode === 'create' ? 'Apply for Pre-qualification' : `Edit ${local.applicationNumber}`}
        subtitle={svc.title}
        actions={
          <>
            <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
            {!isReadOnly && (
              <>
                <button className="btn-secondary" onClick={handleSave}>Save Draft</button>
                <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </>
            )}
          </>
        }
      />

      <div className="max-w-[1280px] mx-auto px-6 pb-10 space-y-4">
        {errors.length > 0 && (
          <div className="card border-danger-500/30 bg-danger-soft p-4">
            <div className="font-semibold text-danger-500 mb-1">Please fix the following before submitting:</div>
            <ul className="list-disc pl-5 text-[12.5px] text-danger-500">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* ===== COMPANY INFO ===== */}
        <Accordion title={companySection.title} description={companySection.description}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="col-span-2">
              <label className="field-label">Pre-Qualification Category *</label>
              <CategoryRadioCards
                value={local.category ?? ''}
                disabled={isReadOnly}
                onChange={(v) => patch('category', v as any)}
              />
            </div>
            <ReadOnlyField label="Company Commercial License" value={local.company.tradePermitNumber} />
            <ReadOnlyField label="Establishment Commercial Name" value={local.company.name} />
            <ReadOnlyField label="Company Owner Name" value={local.company.ownerName} />
            <ReadOnlyField label="Nationality" value={local.company.nationality} />
            <ReadOnlyField label="Authorized Representative" value={local.company.authorizedRepresentative} />
            <ReadOnlyField label="Business Activity" value={local.company.businessActivity} />
            <ReadOnlyField label="Legal Status" value={local.company.legalStatus} />
            <ReadOnlyField label="Establishment Date" value={local.company.establishmentDate} />
            <ReadOnlyField label="Permit Issue Date" value={local.company.tradePermitIssueDate} />
            <ReadOnlyField label="Permit Expiry Date" value={local.company.tradePermitExpiryDate} />
            <ReadOnlyField label="Address" value={local.company.address} />
            <ReadOnlyField label="PO Box" value={local.company.poBox} />
            <ReadOnlyField label="Phone" value={local.company.phone} />
            <ReadOnlyField label="Email" value={local.company.email} />
            <ReadOnlyField label="Website" value={local.company.website ?? '—'} />

            <div>
              <label className="field-label">Branch Office Address (optional)</label>
              <textarea
                disabled={isReadOnly}
                className="field-input min-h-[72px]"
                placeholder="Multiple offices — one per line"
                value={local.branchAddress ?? ''}
                onChange={(e) => patch('branchAddress', e.target.value)}
              />
            </div>
            <div>
              <label className="field-label">Workshop Address *</label>
              <textarea
                disabled={isReadOnly}
                className="field-input min-h-[72px]"
                placeholder="Multiple workshops — one per line"
                value={local.workshopAddress}
                onChange={(e) => patch('workshopAddress', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="field-label">Area of Operations *</label>
              <input
                disabled={isReadOnly}
                className="field-input"
                value={local.areaOfOperations}
                onChange={(e) => patch('areaOfOperations', e.target.value)}
              />
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[11px] font-sans uppercase tracking-wider text-neutral-500 mb-2">Required attachments</div>
            <div className="grid grid-cols-2 gap-3">
              {companySection.attachments?.map((att) => (
                <AttachmentBox
                  key={att.id}
                  def={att}
                  files={filesFor(att.id)}
                  onChange={(files) => setFilesFor(att.id, files)}
                  readOnly={isReadOnly}
                  required={typeof att.required === 'object'
                    ? !!(local.category && att.required.whenCategory.includes(local.category))
                    : att.required}
                  uploadedBy={user.id}
                />
              ))}
            </div>
          </div>
        </Accordion>

        {/* ===== TECHNICAL STAFF ===== */}
        <Accordion
          title={staffSection.title}
          description={staffSection.description}
          badge={minStaff ? `Eng ${engCount}/${minStaff.engineers} · Tech ${techCount}/${minStaff.technicians}` : `${local.technicalStaff.length} added`}
          status={minStaff && (engCount < minStaff.engineers || techCount < minStaff.technicians) ? 'warn' : 'ok'}
        >
          <div className="space-y-3">
            {local.technicalStaff.map((staff, i) => (
              <StaffRow
                key={staff.id}
                staff={staff}
                index={i}
                readOnly={isReadOnly}
                onChange={(next) => setStaff(local.technicalStaff.map((s) => (s.id === staff.id ? next : s)))}
                onRemove={() => setStaff(local.technicalStaff.filter((s) => s.id !== staff.id))}
                attachmentDefs={staffSection.repeatable!.perItemAttachments ?? []}
                uploadedBy={user.id}
              />
            ))}
            {!isReadOnly && (
              <button
                className="btn-secondary w-full justify-center border-dashed"
                onClick={() => setStaff([...local.technicalStaff, blankStaff()])}
              >
                + Add Technical Staff
              </button>
            )}
          </div>
        </Accordion>

        {/* ===== REFERENCE PROJECTS ===== */}
        <Accordion
          title={projectsSection.title}
          description={projectsSection.description}
          badge={`${local.referenceProjects.length} project${local.referenceProjects.length === 1 ? '' : 's'}`}
          status={(local.category && ['A', 'B', 'C'].includes(local.category) && local.referenceProjects.length === 0) ? 'warn' : 'ok'}
        >
          <div className="space-y-3">
            {local.referenceProjects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                readOnly={isReadOnly}
                onChange={(next) => setProjects(local.referenceProjects.map((x) => (x.id === p.id ? next : x)))}
                onRemove={() => setProjects(local.referenceProjects.filter((x) => x.id !== p.id))}
                attachmentDefs={projectsSection.repeatable!.perItemAttachments ?? []}
                uploadedBy={user.id}
              />
            ))}
            {!isReadOnly && (
              <button
                className="btn-secondary w-full justify-center border-dashed"
                onClick={() => setProjects([...local.referenceProjects, blankProject()])}
              >
                + Add Reference Project
              </button>
            )}
          </div>
        </Accordion>

        {!isReadOnly && (
          <Accordion title="Submission Remarks (optional)" defaultOpen={false}>
            <textarea
              className="field-input min-h-[80px]"
              placeholder="Add any remarks for the reviewer when submitting…"
              value={submitComment}
              onChange={(e) => setSubmitComment(e.target.value)}
            />
          </Accordion>
        )}
      </div>
    </>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="px-3 py-2 bg-neutral-50 border border-neutral-100 rounded-md text-[13px] text-neutral-700">{value || '—'}</div>
    </div>
  );
}

// Pre-Qualification Category — radio-card selector following the BRD.
// Replaces the long-text dropdown with four scannable cards showing the
// short title, full description, and the manpower minimum for each tier.
const CATEGORY_DETAILS = [
  {
    code: 'A',
    title: 'Category A',
    description: 'Gas in building installation, maintenance and operations including filling and decanting operations.',
    minEng: 15, minTech: 45,
    tint: { badge: 'bg-doe-red text-white', ring: 'ring-doe-red', soft: 'bg-doe-red-soft' },
  },
  {
    code: 'B',
    title: 'Category B',
    description: 'Gas in building installation, maintenance and operations including filling operations.',
    minEng: 10, minTech: 30,
    tint: { badge: 'bg-action-orange text-white', ring: 'ring-action-orange', soft: 'bg-action-orange-soft' },
  },
  {
    code: 'C',
    title: 'Category C',
    description: 'Gas in building installation and maintenance.',
    minEng: 4, minTech: 12,
    tint: { badge: 'bg-info-500 text-white', ring: 'ring-info-500', soft: 'bg-info-soft' },
  },
  {
    code: 'D',
    title: 'Category D — New Establishments',
    description: 'Gas in building installation and maintenance — cylinder systems only.',
    minEng: 2, minTech: 6,
    tint: { badge: 'bg-success-500 text-white', ring: 'ring-success-500', soft: 'bg-success-soft' },
  },
];

function CategoryRadioCards({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {CATEGORY_DETAILS.map((c) => {
        const selected = value === c.code;
        return (
          <button
            key={c.code}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c.code)}
            className={cn(
              'text-left rounded-lg border p-3.5 transition relative',
              selected
                ? `bg-white border-transparent ring-2 ${c.tint.ring}`
                : 'bg-white border-neutral-200 hover:border-neutral-300',
              disabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            {/* radio indicator + badge */}
            <div className="flex items-start gap-2.5">
              <div className={cn('mt-0.5 w-4 h-4 rounded-full border-2 grid place-items-center flex-shrink-0', selected ? `border-current ${c.tint.badge.split(' ')[0].replace('bg-', 'text-')}` : 'border-neutral-300')}>
                {selected && <span className="w-2 h-2 rounded-full bg-current" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md font-mono font-bold text-[11px] flex-shrink-0', c.tint.badge)}>
                    {c.code}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-950">{c.title}</span>
                </div>
                <p className="text-[11.5px] text-neutral-600 leading-snug mt-1.5">{c.description}</p>
                <div className={cn('inline-flex items-center gap-1.5 mt-2 px-2 h-5 rounded-full text-[10px] font-semibold uppercase tracking-wider', c.tint.soft)}>
                  <span className="font-mono">{c.minEng}</span> Engineers
                  <span className="opacity-40">·</span>
                  <span className="font-mono">{c.minTech}</span> Technicians
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Brings clsx in for the radio-card component without polluting the file's imports.
function cn(...args: (string | false | null | undefined)[]) {
  return args.filter(Boolean).join(' ');
}

function blankStaff(): TechnicalStaff {
  return {
    id: nanoid(),
    emiratesId: '',
    name: '',
    email: '',
    phone: '',
    nationality: '',
    passportNumber: '',
    staffType: 'Engineer',
    position: '',
    education: '',
    attachments: [],
  };
}

function blankProject(): ReferenceProject {
  return {
    id: nanoid(),
    projectName: '',
    clientName: '',
    location: 'Abu Dhabi Emirate',
    scope: [],
    agreementValue: 0,
    startDate: '',
    endDate: '',
    attachments: [],
  };
}

function StaffRow({
  staff, index, onChange, onRemove, readOnly, attachmentDefs, uploadedBy,
}: {
  staff: TechnicalStaff;
  index: number;
  onChange: (s: TechnicalStaff) => void;
  onRemove: () => void;
  readOnly: boolean;
  attachmentDefs: import('../types').AttachmentDef[];
  uploadedBy: string;
}) {
  function patch<K extends keyof TechnicalStaff>(k: K, v: TechnicalStaff[K]) { onChange({ ...staff, [k]: v }); }
  return (
    <div className="border border-neutral-100 rounded-lg p-4 bg-neutral-25">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-sans uppercase tracking-wider text-neutral-500">Staff #{index + 1}</div>
        {!readOnly && <button onClick={onRemove} className="text-danger-500 text-[11.5px] hover:underline">Remove</button>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Emirates ID *</label>
          <input disabled={readOnly} className="field-input" value={staff.emiratesId} onChange={(e) => patch('emiratesId', e.target.value)} placeholder="784-XXXX-XXXXXXX-X" />
        </div>
        <div>
          <label className="field-label">Name</label>
          <input disabled={readOnly} className="field-input" value={staff.name} onChange={(e) => patch('name', e.target.value)} placeholder="Auto-fetched from Emirates ID" />
        </div>
        <div>
          <label className="field-label">Nationality</label>
          <input disabled={readOnly} className="field-input" value={staff.nationality} onChange={(e) => patch('nationality', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input disabled={readOnly} className="field-input" value={staff.email} onChange={(e) => patch('email', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input disabled={readOnly} className="field-input" value={staff.phone} onChange={(e) => patch('phone', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Passport No.</label>
          <input disabled={readOnly} className="field-input" value={staff.passportNumber} onChange={(e) => patch('passportNumber', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Staff Type *</label>
          <select disabled={readOnly} className="field-input" value={staff.staffType} onChange={(e) => patch('staffType', e.target.value as any)}>
            <option>Engineer</option>
            <option>Technician</option>
          </select>
        </div>
        {staff.staffType === 'Technician' && (
          <div>
            <label className="field-label">Type of Technician *</label>
            <select disabled={readOnly} className="field-input" value={staff.technicianType ?? ''} onChange={(e) => patch('technicianType', e.target.value)}>
              <option value="">Select…</option>
              <option>Supervisor</option>
              <option>Welder</option>
              <option>Fitter</option>
              <option>Draftsman</option>
              <option>Others</option>
            </select>
          </div>
        )}
        <div>
          <label className="field-label">Position *</label>
          <input disabled={readOnly} className="field-input" value={staff.position} onChange={(e) => patch('position', e.target.value)} />
        </div>
        <div className="col-span-3">
          <label className="field-label">Highest Educational Certification *</label>
          <input disabled={readOnly} className="field-input" value={staff.education} onChange={(e) => patch('education', e.target.value)} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {attachmentDefs.map((def) => (
          <AttachmentBox
            key={def.id}
            def={def}
            files={staff.attachments.filter((a) => a.defId === def.id)}
            onChange={(files) => {
              const others = staff.attachments.filter((a) => a.defId !== def.id);
              onChange({ ...staff, attachments: [...others, ...files] });
            }}
            readOnly={readOnly}
            required={def.required === true}
            uploadedBy={uploadedBy}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectRow({
  project, onChange, onRemove, readOnly, attachmentDefs, uploadedBy,
}: {
  project: ReferenceProject;
  onChange: (p: ReferenceProject) => void;
  onRemove: () => void;
  readOnly: boolean;
  attachmentDefs: import('../types').AttachmentDef[];
  uploadedBy: string;
}) {
  function patch<K extends keyof ReferenceProject>(k: K, v: ReferenceProject[K]) { onChange({ ...project, [k]: v }); }
  const scopeOptions = ['Gas Plant', 'Gas Distribution Network', 'Gas Utilization System (Building)', 'Gas Utilization System (Food Establishment)', 'Gas Transportation', 'Others'];
  return (
    <div className="border border-neutral-100 rounded-lg p-4 bg-neutral-25">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-sans uppercase tracking-wider text-neutral-500">{project.projectName || 'Reference Project'}</div>
        {!readOnly && <button onClick={onRemove} className="text-danger-500 text-[11.5px] hover:underline">Remove</button>}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="field-label">Project Name *</label>
          <input disabled={readOnly} className="field-input" value={project.projectName} onChange={(e) => patch('projectName', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Client Name *</label>
          <input disabled={readOnly} className="field-input" value={project.clientName} onChange={(e) => patch('clientName', e.target.value)} />
        </div>
        <div>
          <label className="field-label">Project Area / Location *</label>
          <select disabled={readOnly} className="field-input" value={project.location} onChange={(e) => patch('location', e.target.value)}>
            <option>Abu Dhabi Emirate</option>
            <option>UAE</option>
            <option>Others</option>
          </select>
        </div>
        <div>
          <label className="field-label">Agreement Value (AED) *</label>
          <input disabled={readOnly} type="number" className="field-input" value={project.agreementValue || ''} onChange={(e) => patch('agreementValue', Number(e.target.value))} />
        </div>
        <div>
          <label className="field-label">Start Date *</label>
          <input disabled={readOnly} type="date" className="field-input" value={project.startDate} onChange={(e) => patch('startDate', e.target.value)} />
        </div>
        <div>
          <label className="field-label">End Date *</label>
          <input disabled={readOnly} type="date" className="field-input" value={project.endDate} onChange={(e) => patch('endDate', e.target.value)} />
        </div>
        <div className="col-span-3">
          <label className="field-label">Scope (multi-select) *</label>
          <div className="flex flex-wrap gap-2">
            {scopeOptions.map((opt) => {
              const selected = project.scope.includes(opt);
              return (
                <button
                  key={opt}
                  disabled={readOnly}
                  type="button"
                  onClick={() => patch('scope', selected ? project.scope.filter((s) => s !== opt) : [...project.scope, opt])}
                  className={`chip ${selected ? 'bg-action-orange text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {attachmentDefs.map((def) => (
          <AttachmentBox
            key={def.id}
            def={def}
            files={project.attachments.filter((a) => a.defId === def.id)}
            onChange={(files) => {
              const others = project.attachments.filter((a) => a.defId !== def.id);
              onChange({ ...project, attachments: [...others, ...files] });
            }}
            readOnly={readOnly}
            required={def.required === true}
            uploadedBy={uploadedBy}
          />
        ))}
      </div>
    </div>
  );
}

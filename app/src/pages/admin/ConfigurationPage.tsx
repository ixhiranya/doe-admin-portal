import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/auth";
import { usePpsConfig } from "../../store/ppsConfig";
import { getProduct } from "../../data/pps";
import { getCompany } from "../../data/pps-config";
import { StepRail } from "../../components/pps/configuration/StepRail";
import { CompanyStep } from "../../components/pps/configuration/CompanyStep";
import { ProductStep } from "../../components/pps/configuration/ProductStep";
import { TemplateStep } from "../../components/pps/configuration/TemplateStep";
import { isConfigurationComplete } from "../../types/ppsConfig";
import type {
  ProductTemplateAssignment,
  CompanyConfiguration,
} from "../../types/ppsConfig";
import { cn } from "../../lib/utils";

type Mode = "list" | "wizard";

export function ConfigurationPage() {
  const user = useAuth((s) => s.user);
  const configurations = usePpsConfig((s) => s.configurations);
  const saveConfiguration = usePpsConfig((s) => s.saveConfiguration);
  const deleteConfiguration = usePpsConfig((s) => s.deleteConfiguration);

  const [mode, setMode] = useState<Mode>("list");
  const [step, setStep] = useState(1);
  const [editingExisting, setEditingExisting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<ProductTemplateAssignment[]>(
    [],
  );
  const [justSavedCompanyId, setJustSavedCompanyId] = useState<string | null>(
    null,
  );

  const sortedConfigs = useMemo(
    () =>
      [...configurations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [configurations],
  );

  function resetWizardState() {
    setStep(1);
    setCompanyId(null);
    setProductIds([]);
    setAssignments([]);
    setEditingExisting(false);
  }

  function startNew() {
    resetWizardState();
    setMode("wizard");
  }

  function startEdit(config: CompanyConfiguration) {
    setCompanyId(config.companyId);
    setProductIds(config.productIds);
    setAssignments(config.assignments);
    setEditingExisting(true);
    setStep(2);
    setMode("wizard");
  }

  function handleCompanyChange(id: string) {
    setCompanyId(id);
    // Reset downstream steps when switching companies on a fresh (non-edit) run.
    if (!editingExisting) {
      setProductIds([]);
      setAssignments([]);
    }
  }

  function handleProductChange(ids: string[]) {
    setProductIds(ids);
    // Drop assignments for products that were unchecked.
    setAssignments((prev) => prev.filter((a) => ids.includes(a.productId)));
  }

  const draftComplete = companyId
    ? isConfigurationComplete({
        companyId,
        productIds,
        assignments,
        updatedAt: "",
        updatedBy: "",
      })
    : false;

  function handleBack() {
    if (step === 1) {
      // Back is the only way out of the wizard now — on step 1 it exits
      // straight back to the Configuration list and discards the draft.
      setMode("list");
      resetWizardState();
    } else {
      setStep((s) => Math.max(1, s - 1));
    }
  }

  function handleSave() {
    if (!companyId || !draftComplete) return;
    saveConfiguration({
      companyId,
      productIds,
      assignments,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name ?? "Internal User",
    });
    setJustSavedCompanyId(companyId);
    setMode("list");
  }

  const furthestUnlocked = companyId ? (productIds.length > 0 ? 3 : 2) : 1;

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps/dashboard" className="hover:text-doe-red">
            Home
          </Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-neutral-500">Admin Modules</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Configuration</span>
        </nav>
      </div>

      {/* Hero */}
      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 30%, #E89B4C 0%, transparent 50%)",
            }}
          />
          <div className="relative flex items-center gap-6">
            <div
              className="w-12 h-12 rounded-xl grid place-items-center shadow-doe-md font-mono font-bold text-[14px]"
              style={{ background: "#E89B4C", color: "#fff" }}
            >
              CFG
            </div>
            <div className="flex-1">
              <div
                className="text-[10px] font-sans uppercase tracking-[0.22em]"
                style={{ color: "#E89B4C" }}
              >
                Admin Modules
              </div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">
                Configuration
              </h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[640px]">
                Map Companies to the Products they submit, and assign the
                existing Template each Company–Product pairing uses. Internal
                Users only.
              </p>
            </div>
            {mode === "list" && (
              <button
                onClick={startNew}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-action-orange text-white font-semibold text-[12px] hover:bg-action-orange-dark shadow-doe-sm transition whitespace-nowrap"
              >
                <PlusIcon /> New Configuration
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 bg-white">
          <Kpi label="Configured Companies" value={configurations.length} />
          <Kpi
            label="Fully Assigned"
            value={configurations.filter(isConfigurationComplete).length}
            tone="success"
          />
          <Kpi
            label="Needs Attention"
            value={
              configurations.filter((c) => !isConfigurationComplete(c)).length
            }
            tone="warning"
          />
        </div>
      </div>

      {mode === "list" ? (
        <ConfigurationList
          configs={sortedConfigs}
          justSavedCompanyId={justSavedCompanyId}
          onEdit={startEdit}
          onDelete={deleteConfiguration}
        />
      ) : (
        <div className="card p-6">
          <div className="mb-6">
            <StepRail
              current={step}
              furthestUnlocked={furthestUnlocked}
              onJump={setStep}
            />
          </div>

          {step === 1 && (
            <CompanyStep
              value={companyId}
              onChange={handleCompanyChange}
              existingConfigs={configurations}
              locked={editingExisting}
            />
          )}
          {step === 2 && companyId && (
            <ProductStep
              companyName={getCompany(companyId)?.name ?? companyId}
              selected={productIds}
              onChange={handleProductChange}
            />
          )}
          {step === 3 && companyId && (
            <TemplateStep
              companyName={getCompany(companyId)?.name ?? companyId}
              productIds={productIds}
              assignments={assignments}
              onChange={setAssignments}
            />
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-100">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-neutral-300 text-ink-950 text-[12.5px] font-semibold hover:bg-neutral-50 hover:border-neutral-400 shadow-doe-xs transition"
              title={
                step === 1
                  ? "Discard this configuration and return to the list"
                  : "Go back to the previous step"
              }
            >
              <ChevronLeftIcon className="w-3.5 h-3.5" />
              {step === 1 ? "Back to Configurations" : "Back"}
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 ? !companyId : productIds.length === 0}
                className={cn(
                  "btn-primary text-[12.5px]",
                  ((step === 1 && !companyId) ||
                    (step === 2 && productIds.length === 0)) &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!draftComplete}
                title={
                  !draftComplete
                    ? "Every selected product needs a template before you can save."
                    : undefined
                }
                className={cn(
                  "btn-primary text-[12.5px]",
                  !draftComplete && "opacity-50 cursor-not-allowed",
                )}
              >
                Save Configuration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-[9.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </div>
      <div
        className={cn(
          "font-display font-bold text-[20px] mt-0.5 tabular-nums",
          tone === "success"
            ? "text-emerald-600"
            : tone === "warning"
              ? "text-amber-700"
              : "text-ink-950",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ConfigurationList({
  configs,
  justSavedCompanyId,
  onEdit,
  onDelete,
}: {
  configs: CompanyConfiguration[];
  justSavedCompanyId: string | null;
  onEdit: (config: CompanyConfiguration) => void;
  onDelete: (companyId: string) => void;
}) {
  if (configs.length === 0) {
    return (
      <div className="card px-6 py-14 text-center">
        <div className="text-[13px] font-semibold text-ink-950">
          No companies configured yet
        </div>
        <p className="text-[12px] text-neutral-500 mt-1">
          Click "New Configuration" to map a Company to its Products and
          Templates.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-100 shadow-doe-xs overflow-hidden">
      <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-25/60 flex items-center justify-between">
        <div className="text-[10.5px] font-sans uppercase tracking-[0.18em] text-neutral-500">
          Configured Companies
        </div>
        <div className="text-[11px] text-neutral-500">
          {configs.length} on file
        </div>
      </div>
      <table className="w-full text-[12.5px]">
        <thead className="text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500 border-b border-neutral-100 bg-white">
          <tr>
            <th className="text-left px-4 py-2 font-semibold">Company</th>
            <th className="text-left px-4 py-2 font-semibold">Products</th>
            <th className="text-left px-4 py-2 font-semibold">
              Templates Assigned
            </th>
            <th className="text-left px-4 py-2 font-semibold">Status</th>
            <th className="text-left px-4 py-2 font-semibold">Last Updated</th>
            <th className="text-right px-4 py-2 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {configs.map((c) => {
            const company = getCompany(c.companyId);
            const complete = isConfigurationComplete(c);
            const assignedCount = c.assignments.filter(
              (a) => a.templateId,
            ).length;
            const products = c.productIds
              .map((pid) => getProduct(pid))
              .filter((p): p is NonNullable<typeof p> => !!p);
            return (
              <tr
                key={c.companyId}
                className={cn(
                  "hover:bg-neutral-25 transition",
                  c.companyId === justSavedCompanyId && "bg-success-soft/30",
                )}
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-semibold text-ink-950">
                    {company?.name ?? c.companyId}
                  </div>
                  <div className="text-[10.5px] text-neutral-500">
                    {company?.entityType}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="font-mono text-[12px] text-ink-950">
                    {c.productIds.length}
                  </div>
                  <div
                    className="text-[10.5px] text-neutral-500 max-w-[260px] truncate"
                    title={products.map((p) => p.label).join(", ")}
                  >
                    {products
                      .slice(0, 3)
                      .map((p) => p.label)
                      .join(", ")}
                    {products.length > 3
                      ? `, +${products.length - 3} more`
                      : ""}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="font-mono text-[12px] text-ink-950">
                    {assignedCount}
                  </span>
                  <span className="text-neutral-400">
                    {" "}
                    / {c.productIds.length}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap",
                      complete
                        ? "bg-success-soft text-success-500"
                        : "bg-warning-soft text-warning-500",
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "currentColor", opacity: 0.7 }}
                    />
                    {complete ? "Fully Configured" : "Incomplete"}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-neutral-500">
                  <div>
                    {new Date(c.updatedAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-[10.5px]">{c.updatedBy}</div>
                </td>
                <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                  <button
                    onClick={() => onEdit(c)}
                    className="text-action-orange-deep hover:underline font-semibold text-[12px] mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(c.companyId)}
                    className="text-danger-500 hover:underline font-semibold text-[12px]"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

import { getProduct } from "../../../data/pps";
import { templatesForProduct } from "../../../data/pps-config";
import { cn } from "../../../lib/utils";
import type { ProductTemplateAssignment } from "../../../types/ppsConfig";

export function TemplateStep({
  companyName,
  productIds,
  assignments,
  onChange,
}: {
  companyName: string;
  productIds: string[];
  assignments: ProductTemplateAssignment[];
  onChange: (assignments: ProductTemplateAssignment[]) => void;
}) {
  const missing = productIds.filter(
    (pid) => !assignments.find((a) => a.productId === pid)?.templateId,
  );

  function setTemplate(productId: string, templateId: string) {
    const next = assignments.filter((a) => a.productId !== productId);
    next.push({ productId, templateId: templateId || null });
    onChange(next);
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-[16px] font-bold text-ink-950">
          Assign Templates
        </h2>
        <p className="text-[12.5px] text-neutral-500 mt-0.5">
          Assign exactly one existing Template to each product{" "}
          <span className="font-semibold text-ink-950">{companyName}</span>{" "}
          submits below. Templates are created elsewhere by the Internal Team —
          this step only links them.
        </p>
      </div>

      {missing.length > 0 && (
        <div className="mb-3 px-3.5 py-2.5 rounded-lg bg-warning-soft border border-warning-500/20 text-[12px] text-warning-500 font-semibold flex items-center gap-2">
          <WarnIcon /> {missing.length} of {productIds.length} products still
          need a template before this configuration can be saved.
        </div>
      )}

      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-neutral-25/60 border-b border-neutral-100 text-[9.5px] font-sans uppercase tracking-[0.16em] text-neutral-500">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold">Product</th>
              <th className="text-left px-4 py-2.5 font-semibold">
                Company → Product → Template
              </th>
              <th className="text-left px-4 py-2.5 font-semibold w-[320px]">
                Assigned Template
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {productIds.map((pid) => {
              const product = getProduct(pid);
              const templates = templatesForProduct(pid);
              const current =
                assignments.find((a) => a.productId === pid)?.templateId ?? "";
              const ok = !!current;
              return (
                <tr key={pid} className={cn(!ok && "bg-warning-soft/30")}>
                  <td className="px-4 py-2.5 align-top">
                    <div className="font-semibold text-ink-950">
                      {product?.label ?? pid}
                    </div>
                    <div className="text-[10.5px] text-neutral-500">
                      {product?.model === "distributor"
                        ? "Distributor"
                        : "Supplier"}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 align-top text-neutral-500 font-mono text-[11px]">
                    {companyName} → {product?.label ?? pid} →{" "}
                    {ok ? (
                      (templates.find((t) => t.id === current)?.name ?? "—")
                    ) : (
                      <span className="text-warning-500 font-sans">
                        unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 align-top">
                    <select
                      value={current}
                      onChange={(e) => setTemplate(pid, e.target.value)}
                      className={cn(
                        "w-full h-9 px-2 rounded-md border text-[12px] focus:outline-none focus:ring-1",
                        ok
                          ? "border-neutral-200 focus:border-action-orange focus:ring-action-orange/20"
                          : "border-warning-500/50 focus:border-warning-500 focus:ring-warning-500/20",
                      )}
                    >
                      <option value="">Select a template…</option>
                      {templates.length === 0 && (
                        <option value="" disabled>
                          No templates exist yet for this product
                        </option>
                      )}
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (v{t.version})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WarnIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="flex-shrink-0"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

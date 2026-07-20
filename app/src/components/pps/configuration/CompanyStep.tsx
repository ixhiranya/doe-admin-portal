import { useMemo, useState } from "react";
import { ALL_COMPANIES } from "../../../data/pps-config";
import { cn } from "../../../lib/utils";
import type { CompanyConfiguration } from "../../../types/ppsConfig";

export function CompanyStep({
  value,
  onChange,
  existingConfigs,
  locked,
}: {
  value: string | null;
  onChange: (companyId: string) => void;
  existingConfigs: CompanyConfiguration[];
  /** True when editing an already-saved configuration — company can't be changed. */
  locked?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      ALL_COMPANIES.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-display text-[16px] font-bold text-ink-950">
          Select Company
        </h2>
        <p className="text-[12.5px] text-neutral-500 mt-0.5">
          Choose the company you want to configure Product and Template mappings
          for.
        </p>
      </div>

      <div className="relative mb-3 max-w-[360px]">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies…"
          className="w-full h-9 pl-9 pr-3 rounded-md border border-neutral-200 text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20"
        />
      </div>

      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-neutral-500">
            No companies match "{query}".
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto p-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map((c) => {
                const active = c.id === value;
                const existing = existingConfigs.find(
                  (cfg) => cfg.companyId === c.id,
                );
                const disabled = locked && !active;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(c.id)}
                    className={cn(
                      "relative text-left rounded-xl border px-4 py-3.5 transition overflow-hidden",
                      active
                        ? "bg-ink-950 border-ink-950 text-white shadow-doe-sm"
                        : "bg-white border-neutral-100 hover:border-action-orange/40 hover:shadow-doe-xs",
                      disabled &&
                        "opacity-40 cursor-not-allowed hover:border-neutral-100 hover:shadow-none",
                    )}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px]"
                      style={{
                        background: c.isAggregate ? "#7B3FE4" : "#0E76A8",
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-display text-[14px] font-bold truncate",
                          active ? "text-white" : "text-ink-950",
                        )}
                      >
                        {c.name}
                      </span>
                      {existing && (
                        <span
                          className={cn(
                            "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0",
                            active
                              ? "bg-white/15 text-white"
                              : "bg-action-orange-soft text-action-orange-deep",
                          )}
                        >
                          Configured
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] mt-1",
                        active ? "text-white/70" : "text-neutral-500",
                      )}
                    >
                      {c.entityType}
                      {existing &&
                        ` · ${existing.productIds.length} ${existing.productIds.length === 1 ? "product" : "products"}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

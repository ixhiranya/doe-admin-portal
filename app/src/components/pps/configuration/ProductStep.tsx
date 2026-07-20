import { useMemo, useState } from "react";
import { CONFIGURABLE_PRODUCTS } from "../../../data/pps-config";
import { cn } from "../../../lib/utils";

export function ProductStep({
  companyName,
  selected,
  onChange,
}: {
  companyName: string;
  selected: string[];
  onChange: (productIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      CONFIGURABLE_PRODUCTS.filter((p) =>
        p.label.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [query],
  );

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }
  function selectAll() {
    onChange(Array.from(new Set([...selected, ...filtered.map((p) => p.id)])));
  }
  function clearAll() {
    const filteredIds = new Set(filtered.map((p) => p.id));
    onChange(selected.filter((id) => !filteredIds.has(id)));
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-[16px] font-bold text-ink-950">
            Assign Products
          </h2>
          <p className="text-[12.5px] text-neutral-500 mt-0.5">
            Select every product that{" "}
            <span className="font-semibold text-ink-950">{companyName}</span>{" "}
            submits data for. This creates the Company → Product relationship.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-display text-[20px] font-bold text-ink-950 tabular-nums">
            {selected.length}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500">
            of {CONFIGURABLE_PRODUCTS.length} selected
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-neutral-200 text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20"
          />
        </div>
        <button
          type="button"
          onClick={selectAll}
          className="btn-secondary text-[12px] h-9 px-3 whitespace-nowrap"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="btn-secondary text-[12px] h-9 px-3 whitespace-nowrap"
        >
          Clear All
        </button>
      </div>

      <div className="border border-neutral-100 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-neutral-500">
            No products match "{query}".
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100">
            {filtered.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition",
                    checked
                      ? "bg-action-orange-soft/40"
                      : "hover:bg-neutral-25",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 rounded accent-action-orange"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-ink-950 truncate">
                      {p.label}
                    </div>
                  </div>
                  <span className="text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 whitespace-nowrap">
                    {p.model === "distributor" ? "Distributor" : "Supplier"}
                  </span>
                </label>
              );
            })}
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

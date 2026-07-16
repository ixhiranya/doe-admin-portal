import { Link } from 'react-router-dom';
import { GAS_TYPES, PRODUCT_TYPES, UNITS } from '../../services/gasRegister/technical';
import { CATEGORIES } from '../../services/gasRegister/customers';
import { CERTS } from '../../services/gasRegister/compliance';
import { cn } from '../../lib/utils';

// =============================================================================
// Technical Master Data · INDEX — BN 8 of the Gas Register SDD.
// Landing page linking to the 5 dedicated sub-views, each with its own
// list + create flow.
// =============================================================================

const SECTIONS = [
  { id: 'gas-types',     label: 'Type of Gas',         description: 'NG · CNG · LPG · Propane · Butane · Butadienes · Benzol. Drives every gas-type dropdown across the platform.', href: '/gas-register/technical-master-data/gas-types',     badge: 'GT', badgeCls: 'bg-action-orange-soft text-action-orange-deep', count: GAS_TYPES.length, ref: 'SDD §3.8.1' },
  { id: 'product-types', label: 'Product Type',        description: 'CNG decanting point · LPG Storage Tank · SNG Distribution · Cylinder Storage. Used by Storage Methods + Inflow + Outflow.', href: '/gas-register/technical-master-data/product-types', badge: 'PT', badgeCls: 'bg-blue-50 text-blue-700',                       count: PRODUCT_TYPES.length, ref: 'SDD §3.8.2' },
  { id: 'units',         label: 'Unit of Measurement', description: 'Litres / SCM with configurable per-gas conversion factors. Displayed in parallel across all volumetric fields.', href: '/gas-register/technical-master-data/units',         badge: 'UM', badgeCls: 'bg-amber-50 text-amber-700',                     count: UNITS.length,          ref: 'SDD §3.8.3' },
  { id: 'certificates',  label: 'Tracked Certificates', description: 'ISTIFAA · DOE NOC · AMC Gas · GAS TPI COC — drives the live Compliance Rate computation.',                       href: '/gas-register/technical-master-data/certificates',  badge: 'TC', badgeCls: 'bg-emerald-50 text-emerald-700',                 count: CERTS.length,          ref: 'SDD §3.14.1' },
  { id: 'categories',    label: 'Customer Categories',  description: '10 SDD categories with per-category Building Types + EID / CN-MC identification flow.',                          href: '/gas-register/technical-master-data/categories',    badge: 'CT', badgeCls: 'bg-violet-50 text-violet-700',                   count: CATEGORIES.length,     ref: 'SDD §3.1.1' },
];

export function TechnicalMasterDataPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span>Gas Register</span>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Technical Master Data</span>
        </nav>
        <div className="font-sans text-[11px] tracking-wider text-neutral-500 uppercase">BN 8 · Gas Register SDD</div>
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="relative px-6 py-5 bg-gradient-to-br from-[#1E2128] via-[#262A33] to-[#1E2128] text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #F59E0B 0%, transparent 50%)' }} />
          <div className="relative flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/90 grid place-items-center shadow-doe-md">⚙️</div>
            <div className="flex-1">
              <div className="text-[10px] font-sans uppercase tracking-[0.22em] text-amber-200">Technical Master Data</div>
              <h1 className="font-display font-bold text-[22px] leading-tight mt-1">Shared configuration & catalogues</h1>
              <p className="text-[12.5px] text-white/70 mt-1 max-w-[680px]">
                Single source of truth for gas-type, product-type, unit, certificate and customer-category dropdowns
                across the entire Gas Register. Editable by DOE administrators per SDD §3.8.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5 sections — each opens a dedicated list + create page */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.id} to={s.href}
            className="card p-4 hover:border-action-orange transition group">
            <div className="flex items-start gap-3 mb-3">
              <div className={cn('w-10 h-10 rounded-lg grid place-items-center font-mono font-bold text-[11px] flex-shrink-0', s.badgeCls)}>
                {s.badge}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[14px] font-semibold text-ink-950 leading-tight">{s.label}</div>
                  <span className="text-[10px] font-mono text-neutral-500">{s.ref}</span>
                </div>
                <div className="text-[11.5px] text-neutral-500 mt-1 line-clamp-3 leading-relaxed">{s.description}</div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5">
              <div className="text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">
                <span className="font-bold text-ink-950 tabular-nums">{s.count}</span> entries on file
              </div>
              <span className="text-[11px] font-semibold text-action-orange-deep group-hover:text-ink-950 transition">
                Manage →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-info-500/30 bg-info-soft/40 p-3 text-[11px] text-info-500">
        <strong className="uppercase tracking-wider mr-1">Note ·</strong>
        Categories, Building Types, Type of Gas, Product Type, Unit of Measurement and Compliance Rate calculation
        rules are shared configuration across the DOE Unified Platform per SDD §5. They are maintained centrally
        so every module picks up changes consistently.
      </div>
    </div>
  );
}

// src/pages/admin/MasterDataPage.tsx
// import { Link } from 'react-router-dom';

// export function MasterDataPage() {
//   return (
//     <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
//       <div className="flex items-center justify-between text-[12px] mb-5">
//         <nav className="text-neutral-500">
//           <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
//           <span className="mx-2 text-neutral-300">›</span>
//           <span className="text-ink-950 font-semibold">Master Data</span>
//         </nav>
//       </div>
//       <div className="card p-6">
//         <h1 className="font-display font-bold text-[20px] text-ink-950">Master Data</h1>
//         <p className="text-[12.5px] text-neutral-500 mt-1">Content coming soon.</p>
//       </div>
//     </div>
//   );
// }
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useMasterData } from '../../store/masterData';
import { Breadcrumb, HeroHeader } from '../../components/masterdata/Chrome';

// =============================================================================
// Admin Modules -> Master Data - landing page.
// Central reference data shared across all PPS services & modules (per the
// Admin Modules dropdown description in AppLayout). Each card opens a
// dedicated list + create/edit/view/delete flow for one of the 8 master
// tables defined in the PPS Data Design doc (tables 1, 2, 4, 6, 7, 21, 22 +
// the normalized Entity Type lookup - see module notes).
// =============================================================================

export function MasterDataPage() {
  const { products, companies, uoms, entityTypes, regions, segments, entityGroups, entityGroupMembers } = useMasterData();

  const SECTIONS = [
    { id: 'products', label: 'Products', description: 'The 12 petroleum products companies report on, with their default unit of measure and TPI flag.', href: '/admin/master-data/products', badge: 'PR', badgeBg: '#0E76A8', count: products.length, ref: 'Table 1 - PRODUCT' },
    { id: 'companies', label: 'Companies', description: 'The ~36 entities that submit data, including parent groups and aggregate buckets (e.g. Grey Market).', href: '/admin/master-data/companies', badge: 'CO', badgeBg: '#B86E25', count: companies.length, ref: 'Table 2 - COMPANY' },
    { id: 'uom', label: 'UOM', description: 'Units of measure (kt, Tonnes, Billion btu, Liters) with same-dimension conversion factors.', href: '/admin/master-data/uom', badge: 'UM', badgeBg: '#D97706', count: uoms.length, ref: 'Table 4 - UOM' },
    { id: 'entity-types', label: 'Entity Types', description: 'Producer, Distributor, Importer, Consumer, Aggregator - the roles a company can play.', href: '/admin/master-data/entity-types', badge: 'ET', badgeBg: '#7C3AED', count: entityTypes.length, ref: 'Normalized from COMPANY.entity_type' },
    { id: 'regions', label: 'Regions', description: 'Abu Dhabi City, Al Ain, Al Dhafra - the 3 Emirate regions demand is split by.', href: '/admin/master-data/regions', badge: 'RG', badgeBg: '#22A745', count: regions.length, ref: 'Table 6 - REGION' },
    { id: 'segments', label: 'Segments', description: 'Customer / sales segments (Residential, Commercial, B2C, B2B ...) that demand is broken down by.', href: '/admin/master-data/segments', badge: 'SG', badgeBg: '#DC2626', count: segments.length, ref: 'Table 7 - SEGMENT' },
    { id: 'entity-groups', label: 'Entity Groups', description: 'Names a group of companies whose figures are consolidated together (Tier-2 consolidation).', href: '/admin/master-data/entity-groups', badge: 'EG', badgeBg: '#0891B2', count: entityGroups.length, ref: 'Table 21 - ENTITY_GROUP' },
    { id: 'entity-group-members', label: 'Entity Group Members', description: 'Which companies belong to which Entity Group - drives the Tier-2 consolidation SUM.', href: '/admin/master-data/entity-group-members', badge: 'GM', badgeBg: '#475569', count: entityGroupMembers.length, ref: 'Table 22 - ENTITY_GROUP_MEMBER' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <Breadcrumb items={[{ label: 'Home', to: '/pps-dashboard' }, { label: 'Master Data' }]} tag="Admin Modules" />

      <HeroHeader
        badge="MD"
        badgeBg="#E89B4C"
        eyebrow="Master Data"
        title="Central reference data"
        subtitle="Single source of truth for the dropdowns, foreign keys and validations used across every PPS submission form - Products, Companies, UOM, Entity Types, Regions, Segments and the Tier-2 consolidation Entity Groups."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SECTIONS.map((s) => (
          <Link key={s.id} to={s.href} className="card p-4 hover:border-action-orange transition group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg grid place-items-center font-mono font-bold text-[11px] flex-shrink-0 text-white" style={{ background: s.badgeBg }}>
                {s.badge}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ink-950 leading-tight">{s.label}</div>
                <div className="text-[10px] font-mono text-neutral-400 mt-0.5">{s.ref}</div>
              </div>
            </div>
            <div className="text-[11.5px] text-neutral-500 leading-relaxed line-clamp-3 mb-3">{s.description}</div>
            <div className={cn('flex items-center justify-between border-t border-neutral-100 pt-2.5')}>
              <div className="text-[10.5px] font-sans uppercase tracking-wider text-neutral-500">
                <span className="font-bold text-ink-950 tabular-nums">{s.count}</span> records
              </div>
              <span className="text-[11px] font-semibold text-action-orange-deep group-hover:text-ink-950 transition">Manage &rarr;</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-info-500/30 bg-info-soft/40 p-3 text-[11px] text-info-500">
        <strong className="uppercase tracking-wider mr-1">Note ·</strong>
        These 8 lists are reference/master data only - submission workflow (Draft to Submitted to Under Review to
        Approved/Returned) is handled separately in BPM per the Data Design doc. Data is stored locally in this
        prototype (mock service); no backend calls are made.
      </div>
    </div>
  );
}

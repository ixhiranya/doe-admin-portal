// src/pages/admin/MasterDataPage.tsx
import { Link } from 'react-router-dom';

export function ConfigurationPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 pt-5 pb-10">
      <div className="flex items-center justify-between text-[12px] mb-5">
        <nav className="text-neutral-500">
          <Link to="/pps-dashboard" className="hover:text-doe-red">Home</Link>
          <span className="mx-2 text-neutral-300">›</span>
          <span className="text-ink-950 font-semibold">Configuration Data</span>
        </nav>
      </div>
      <div className="card p-6">
        <h1 className="font-display font-bold text-[20px] text-ink-950">Configuration Data</h1>
        <p className="text-[12.5px] text-neutral-500 mt-1">Content coming soon.</p>
      </div>
    </div>
  );
}
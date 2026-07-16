import { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import type { PlayerCompany } from '../../data/pps-modules';

// ============================================================================
// Add New Player modal — opened from the "+ Add New Player" CTA on the Players
// tab. Reuses the existing PPS modal language (fixed inset-0 · bg-ink-950/40 ·
// white rounded-xl · shadow-doe-lg · h-9 inputs · btn-primary / btn-secondary).
// Inline validation; the primary action stays disabled until every required
// field holds a valid value. Adds one PlayerCompany with a single contact.
// ============================================================================

// Country dial codes for the phone selector (GCC first, then common).
const DIAL_CODES = ['+971', '+966', '+973', '+974', '+965', '+968', '+970', '+20', '+91', '+44', '+1'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddPlayerModal({ open, productLabel, onClose, onAdd }: {
  open: boolean;
  productLabel: string;
  onClose: () => void;
  onAdd: (player: PlayerCompany) => void;
}) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [dial, setDial] = useState('+971');
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const phoneDigits = phone.replace(/\D/g, '');
  const errors = useMemo(() => ({
    company: company.trim() ? '' : 'Company name is required.',
    role: role.trim() ? '' : 'Role is required.',
    contact: contact.trim() ? '' : 'Point of contact is required.',
    email: !email.trim() ? 'Email address is required.' : EMAIL_RE.test(email.trim()) ? '' : 'Enter a valid email address.',
    phone: !phoneDigits ? 'Phone number is required.' : phoneDigits.length < 6 ? 'Enter a valid phone number.' : '',
  }), [company, role, contact, email, phoneDigits]);

  const isValid = !errors.company && !errors.role && !errors.contact && !errors.email && !errors.phone;

  if (!open) return null;

  const markTouched = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k: keyof typeof errors) => touched[k] && errors[k];

  function submit() {
    setTouched({ company: true, role: true, contact: true, email: true, phone: true });
    if (!isValid) return;
    onAdd({
      company: company.trim(),
      role: role.trim(),
      contacts: [{ name: contact.trim(), email: email.trim(), phone: `${dial} ${phone.trim()}` }],
    });
  }

  const inputCls = (k: keyof typeof errors) => cn(
    'w-full h-9 px-2.5 rounded-md border bg-white text-[12.5px] focus:outline-none focus:ring-1',
    show(k) ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
            : 'border-neutral-200 focus:border-action-orange focus:ring-action-orange/20',
  );

  return (
    <div className="fixed inset-0 bg-ink-950/40 z-50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-doe-lg w-[520px] max-w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-[17px] font-bold text-ink-950">Add New Player</h3>
            <p className="text-[11.5px] text-neutral-500 mt-0.5">New market participant for {productLabel}.</p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-ink-950 text-[15px] leading-none mt-0.5">✕</button>
        </div>

        {/* body */}
        <div className="px-5 py-4 overflow-y-auto space-y-5">
          <section>
            <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-2.5">Player Information</div>
            <div className="space-y-3">
              <Field label="Company Name" required error={show('company') ? errors.company : ''}>
                <input value={company} onChange={(e) => setCompany(e.target.value)} onBlur={() => markTouched('company')} placeholder="e.g. ADNOC Distribution" className={inputCls('company')} />
              </Field>
              <Field label="Role" required error={show('role') ? errors.role : ''}>
                <input value={role} onChange={(e) => setRole(e.target.value)} onBlur={() => markTouched('role')} placeholder="e.g. Distribution in Abu Dhabi" className={inputCls('role')} />
              </Field>
            </div>
          </section>

          <section>
            <div className="text-[10px] font-sans uppercase tracking-[0.16em] text-neutral-500 mb-2.5">Primary Point of Contact</div>
            <div className="space-y-3">
              <Field label="Point of Contact" required error={show('contact') ? errors.contact : ''}>
                <input value={contact} onChange={(e) => setContact(e.target.value)} onBlur={() => markTouched('contact')} placeholder="e.g. Shakeel Khan" className={inputCls('contact')} />
              </Field>
              <Field label="Email Address" required error={show('email') ? errors.email : ''}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => markTouched('email')} placeholder="name@company.ae" className={inputCls('email')} />
              </Field>
              <Field label="Phone Number" required error={show('phone') ? errors.phone : ''}>
                <div className="flex items-stretch gap-2">
                  <select value={dial} onChange={(e) => setDial(e.target.value)} className="h-9 px-2 rounded-md border border-neutral-200 bg-white text-[12.5px] focus:outline-none focus:border-action-orange focus:ring-1 focus:ring-action-orange/20" dir="ltr">
                    {DIAL_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => markTouched('phone')} placeholder="50 123 4567" className={cn('flex-1', inputCls('phone'))} dir="ltr" />
                </div>
              </Field>
            </div>
          </section>
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-[13px] h-10 px-4">Cancel</button>
          <button onClick={submit} disabled={!isValid} className={cn('btn-primary text-[13px] h-10 px-4', !isValid && 'opacity-40 cursor-not-allowed')}>Add Player</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-ink-950 mb-1">
        {label}{required && <span className="text-doe-red"> *</span>}
      </label>
      {children}
      {error && <p className="text-[10.5px] text-danger-500 mt-1">{error}</p>}
    </div>
  );
}

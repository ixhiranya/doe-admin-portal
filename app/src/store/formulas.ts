import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { DEFAULT_FORMULAS, type FormulaDef } from '../data/formulaDefaults';

interface FormulasState {
  formulas: FormulaDef[];
  addFormula: (input: { name: string; expression: string; company: string; product: string; description?: string }) => FormulaDef;
}

export const useFormulas = create<FormulasState>()(
  persist(
    (set) => ({
      formulas: DEFAULT_FORMULAS,
      addFormula: (input) => {
        const f: FormulaDef = { id: `FRM-${nanoid(6).toUpperCase()}`, ...input };
        set((s) => ({ formulas: [f, ...s.formulas] }));
        return f;
      },
    }),
    { name: 'doe.pps.admin.formulas' },
  ),
);

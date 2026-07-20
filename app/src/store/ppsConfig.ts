import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_CONFIGURATIONS } from "../data/pps-config";
import type { CompanyConfiguration } from "../types/ppsConfig";

// ============================================================================
// In-memory (localStorage-persisted) store for saved Configuration-module
// records. Frontend-only — no API calls. One record per company; saving a
// configuration for a company that already has one overwrites it in place,
// which is what lets the Configuration Home list always reflect the latest
// save for every company.
// ============================================================================

interface PpsConfigStore {
  configurations: CompanyConfiguration[];
  getConfiguration: (companyId: string) => CompanyConfiguration | undefined;
  saveConfiguration: (config: CompanyConfiguration) => void;
  deleteConfiguration: (companyId: string) => void;
}

export const usePpsConfig = create<PpsConfigStore>()(
  persist(
    (set, get) => ({
      configurations: SEED_CONFIGURATIONS,
      getConfiguration: (companyId) =>
        get().configurations.find((c) => c.companyId === companyId),
      saveConfiguration: (config) =>
        set((state) => ({
          configurations: [
            ...state.configurations.filter(
              (c) => c.companyId !== config.companyId,
            ),
            config,
          ],
        })),
      deleteConfiguration: (companyId) =>
        set((state) => ({
          configurations: state.configurations.filter(
            (c) => c.companyId !== companyId,
          ),
        })),
    }),
    { name: "doe-pps-configuration-store" },
  ),
);

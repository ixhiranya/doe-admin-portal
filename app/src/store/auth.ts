import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { SEED_PASSWORD, SEED_USERS, STORAGE_KEYS } from './seed';

interface AuthStore {
  user: User | null;
  login: (userId: string, password: string, tab: 'internal' | 'external') => { ok: boolean; error?: string };
  logout: () => void;
  switchTo: (userId: string) => void;
}

function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return SEED_USERS;
    return JSON.parse(raw) as User[];
  } catch {
    return SEED_USERS;
  }
}

export const useAuth = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: (userId, password, tab) => {
        const id = userId.trim().toLowerCase();
        if (!id) return { ok: false, error: 'Please enter your User Name.' };
        if (password !== SEED_PASSWORD) {
          return { ok: false, error: 'Incorrect password. (Hint: use "manage" for all demo accounts.)' };
        }
        const user = loadUsers().find((u) => u.id.toLowerCase() === id);
        if (!user) {
          return { ok: false, error: `No user found with ID "${id}".` };
        }
        if (tab === 'internal' && user.userType !== 'internal') {
          return { ok: false, error: 'This account is an External Partner. Switch to the "External Partner" tab.' };
        }
        if (tab === 'external' && user.userType !== 'external') {
          return { ok: false, error: 'This account is Internal Staff. Switch to the "Internal Staff" tab.' };
        }
        set({ user });
        return { ok: true };
      },
      logout: () => set({ user: null }),
      switchTo: (userId) => {
        const user = loadUsers().find((u) => u.id.toLowerCase() === userId.toLowerCase());
        if (user) set({ user });
      },
    }),
    { name: STORAGE_KEYS.AUTH },
  ),
);

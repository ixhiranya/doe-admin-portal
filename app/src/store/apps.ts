import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Application, NotificationLogEntry, User } from '../types';
import { seedIfEmpty, STORAGE_KEYS } from './seed';
import { getService } from '../services/registry';
import { applyTransition, getAvailableTransitions } from '../engine/workflow';

// Ensure seed data is in localStorage before the store reads it.
seedIfEmpty();

interface AppsStore {
  apps: Application[];
  notifs: NotificationLogEntry[];
  refresh: () => void;
  createDraft: (serviceId: string, applicant: User) => Application;
  saveApp: (app: Application) => void;
  runTransition: (appId: string, transitionId: string, user: User, comment?: string) => { ok: boolean; error?: string };
  markNotificationsRead: () => void;
}

function loadApps(): Application[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.APPS) || '[]');
  } catch {
    return [];
  }
}

function loadNotifs(): NotificationLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFS) || '[]');
  } catch {
    return [];
  }
}

function saveApps(apps: Application[]) {
  localStorage.setItem(STORAGE_KEYS.APPS, JSON.stringify(apps));
}

function saveNotifs(n: NotificationLogEntry[]) {
  localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(n));
}

export const useApps = create<AppsStore>((set, get) => ({
  apps: loadApps(),
  notifs: loadNotifs(),

  refresh: () => set({ apps: loadApps(), notifs: loadNotifs() }),

  createDraft: (serviceId, applicant) => {
    const svc = getService(serviceId as any);
    if (!svc) throw new Error(`Unknown service ${serviceId}`);
    if (!applicant.company) throw new Error('Applicant has no associated company');
    const now = new Date().toISOString();
    const app: Application = {
      id: nanoid(),
      applicationNumber: '—',
      serviceId: svc.id,
      module: svc.module,
      state: svc.initialState,
      applicantUserId: applicant.id,
      company: applicant.company,
      workshopAddress: '',
      areaOfOperations: '',
      attachments: [],
      technicalStaff: [],
      referenceProjects: [],
      timeline: [
        {
          id: nanoid(),
          at: now,
          byUserId: applicant.id,
          byUserName: applicant.name,
          byUserRole: 'applicant',
          action: 'Created Draft',
          toState: svc.initialState,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    const next = [...get().apps, app];
    saveApps(next);
    set({ apps: next });
    return app;
  },

  saveApp: (app) => {
    const updated = { ...app, updatedAt: new Date().toISOString() };
    const idx = get().apps.findIndex((a) => a.id === app.id);
    const next = idx >= 0 ? get().apps.map((a, i) => (i === idx ? updated : a)) : [...get().apps, updated];
    saveApps(next);
    set({ apps: next });
  },

  runTransition: (appId, transitionId, user, comment) => {
    const app = get().apps.find((a) => a.id === appId);
    if (!app) return { ok: false, error: 'Application not found' };
    const svc = getService(app.serviceId);
    if (!svc) return { ok: false, error: 'Service definition not found' };
    const available = getAvailableTransitions(svc, app, user);
    const transition = available.find((t) => t.id === transitionId);
    if (!transition) return { ok: false, error: 'This action is not available to you in the current state.' };
    if (transition.requiresComment && !comment?.trim()) {
      return { ok: false, error: 'Comments are required for this action.' };
    }
    const { app: nextApp, notifications } = applyTransition(svc, app, transition, user, { comment });
    const apps = get().apps.map((a) => (a.id === appId ? nextApp : a));
    const notifs = [
      ...get().notifs,
      ...notifications.map<NotificationLogEntry>((n) => ({
        ...n,
        id: nanoid(),
        at: new Date().toISOString(),
        applicationId: appId,
      })),
    ];
    saveApps(apps);
    saveNotifs(notifs);
    set({ apps, notifs });
    return { ok: true };
  },

  markNotificationsRead: () => {},
}));

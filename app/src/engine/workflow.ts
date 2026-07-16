import type {
  Application,
  Role,
  ServiceDefinition,
  StateDef,
  TransitionDef,
  User,
  NotificationLogEntry,
  TimelineEntry,
} from '../types';
import { nanoid } from 'nanoid';

// ----- State machine helpers ------------------------------------------------

export function getState(svc: ServiceDefinition, id: string): StateDef | undefined {
  return svc.states.find((s) => s.id === id);
}

export function getAvailableTransitions(
  svc: ServiceDefinition,
  app: Application,
  user: User,
): TransitionDef[] {
  return svc.transitions.filter((t) => {
    const fromOk = Array.isArray(t.from) ? t.from.includes(app.state) : t.from === app.state;
    if (!fromOk) return false;
    if (!t.allowedRoles.includes(user.role)) return false;
    return true;
  });
}

export function applyTransition(
  svc: ServiceDefinition,
  app: Application,
  transition: TransitionDef,
  user: User,
  opts: { comment?: string } = {},
): { app: Application; notifications: Omit<NotificationLogEntry, 'id' | 'at' | 'applicationId'>[] } {
  const now = new Date().toISOString();
  const timelineEntry: TimelineEntry = {
    id: nanoid(),
    at: now,
    byUserId: user.id,
    byUserName: user.name,
    byUserRole: user.role,
    action: transition.label,
    fromState: app.state,
    toState: transition.to,
    comment: opts.comment,
  };

  const next: Application = {
    ...app,
    state: transition.to,
    updatedAt: now,
    timeline: [...app.timeline, timelineEntry],
  };

  // Side-effects on common transitions
  if (transition.id === 'submit') {
    next.submittedOn = now;
    next.applicationNumber = next.applicationNumber || generateApplicationNumber(svc);
    next.slaDueDate = computeSlaDueDate(svc, next.state);
  }
  if (transition.to === 'approved' || transition.to === 'issued') {
    next.approvedOn = now;
  }
  if (transition.id === 'pay-fee') {
    next.feePaid = true;
    next.feeReceipt = {
      receiptNumber: `RC-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
      paidAt: now,
      amount: svc.feeAmount ?? 0,
    };
    const issued = new Date();
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + (svc.certificateValidityYears ?? 1));
    next.certificate = {
      number: `${prefixForService(svc)}-CERT-${issued.getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`,
      issuedAt: issued.toISOString(),
      expiresAt: expiry.toISOString(),
    };
    next.expiryDate = expiry.toISOString();
    next.fileNumber = next.fileNumber || `${prefixForService(svc)}-FILE-${Math.floor(Math.random() * 90000 + 10000)}`;
  }

  // Compose notifications from templates referenced by this transition
  const notifs: Omit<NotificationLogEntry, 'id' | 'at' | 'applicationId'>[] = [];
  (transition.notifications ?? []).forEach((tplId) => {
    const tpl = svc.notifications.find((n) => n.id === tplId);
    if (!tpl) return;
    const rendered = renderTemplate(tpl.subject, next, opts.comment);
    const body = renderTemplate(tpl.body, next, opts.comment);
    notifs.push({
      templateId: tpl.id,
      channel: tpl.channel,
      toUserId: tpl.to,
      subject: rendered,
      body,
    });
  });
  return { app: next, notifications: notifs };
}

export function renderTemplate(s: string, app: Application, comment?: string): string {
  return s
    .replaceAll('%CompanyName%', app.company.name)
    .replaceAll('%Company Name%', app.company.name)
    .replaceAll('%ApplicationNumber%', app.applicationNumber)
    .replaceAll('%Comments%', comment ?? '')
    .replaceAll('%Comment%', comment ?? '');
}

export function generateApplicationNumber(svc: ServiceDefinition): string {
  const yr = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 90000 + 10000);
  return `${prefixForService(svc)}-${yr}-${seq}`;
}

export function prefixForService(svc: ServiceDefinition): string {
  const m =
    svc.module === 'gas' ? 'GSO' :
    svc.module === 'hoe' ? 'HOE' :
    svc.module === 'noc' ? 'NOC' :
    svc.module === 'amc' ? 'AMC' :
    svc.module === 'coc' ? 'COC' :
    svc.module.toUpperCase();
  const a = svc.action.toUpperCase().slice(0, 3);
  return `${m}-${a}`;
}

function computeSlaDueDate(svc: ServiceDefinition, currentState: string): string {
  // Sum the SLA days starting from current stage onward
  const start = svc.sla.findIndex((s) => s.role !== 'applicant');
  let days = 0;
  for (let i = Math.max(0, start); i < svc.sla.length; i++) {
    days += svc.sla[i].days;
  }
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

// ----- Queue / visibility --------------------------------------------------

export function userCanSeeApplication(app: Application, user: User): boolean {
  if (user.userType === 'internal') {
    // Internal users see only applications for modules they own
    return user.modules.includes(app.module);
  }
  // External users see only their own
  return app.applicantUserId === user.id;
}

export function isInQueueFor(app: Application, user: User, svc: ServiceDefinition): boolean {
  const state = getState(svc, app.state);
  if (!state) return false;
  if (user.role === 'applicant') return app.applicantUserId === user.id && state.ownerRole === 'applicant';
  if (!user.modules.includes(app.module)) return false;
  return state.ownerRole === user.role;
}

export function roleLabel(role: Role): string {
  const map: Record<Role, string> = {
    applicant: 'Applicant',
    engineer: 'PPS Engineer / Reviewer',
    section_head: 'PPS Section Head',
    director: 'PPS Director',
    admin: 'DoE Admin',
    pps_entity: 'PPS Entity Submitter',
    pps_reviewer: 'DoE PPS Reviewer',
    pps_approver: 'DoE PPS Approver',
    vap_member: 'VAP Committee Member',
    vap_secretary: 'VAP Committee Secretary',
    inspector: 'DoE PPS Inspector',
    senior_inspector: 'DoE PPS Senior Inspector',
    regulation_team: 'DoE PPS Regulation Team',
  };
  return map[role] ?? role;
}

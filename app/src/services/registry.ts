import type { ServiceDefinition, ServiceId, Module } from '../types';
import { gasIssueService } from './gas/issue';
import { gasRenewService } from './gas/renew';
import { gasModifyService } from './gas/modify';
import { gasCancelService } from './gas/cancel';
import { gasRevokeService } from './gas/revoke';
import { hoeIssueService } from './hoe/issue';
import { hoeRenewService } from './hoe/renew';
import { hoeModifyService } from './hoe/modify';
import { hoeCancelService } from './hoe/cancel';
import { hoeRevokeService } from './hoe/revoke';
import { nocRenewService } from './noc/renew';
import { nocCancelService } from './noc/cancel';
import { nocRevokeService } from './noc/revoke';
import { amcIssueService } from './amc/issue';
import { amcRenewService } from './amc/renew';
import { amcModifyService } from './amc/modify';
import { amcCancelService } from './amc/cancel';
import { amcRevokeService } from './amc/revoke';
import { cocModifyService } from './coc/modify';
import { cocCancelService } from './coc/cancel';
import { maesIssueService } from './maes/issue';
import { maesRenewService } from './maes/renew';
import { maesModifyService } from './maes/modify';
import { maesCancelService } from './maes/cancel';
import { maesRevokeService } from './maes/revoke';

// Add new service definitions here. The engine, list pages, forms and review
// screens all read from this registry — they do NOT hard-code Gas vs HOE.
const SERVICES: ServiceDefinition[] = [
  // ---- Gas (BRD 1: Issuance, BRD 2: Renewal / Modification / Cancellation / Revocation) ----
  gasIssueService,
  gasRenewService,
  gasModifyService,
  gasCancelService,
  gasRevokeService,
  // ---- House of Expertise / Third Party Inspection (BRD 3: Issuance, BRD 4: Enhancements) ----
  hoeIssueService,
  hoeRenewService,
  hoeModifyService,
  hoeCancelService,
  hoeRevokeService,
  // ---- NOC — No Objection Certificate to operate the Gas Systems (BRD 5: Enhancements only) ----
  nocRenewService,
  nocCancelService,
  nocRevokeService,
  // ---- AMC — Annual Maintenance Contract for Gas Systems (AMC Enhancements SDD: Issuance + Renewal + Modification + Cancellation + Revocation) ----
  amcIssueService,
  amcRenewService,
  amcModifyService,
  amcCancelService,
  amcRevokeService,
  // ---- COC — Certificate of Completion for Gas Systems (COC Enhancement SDD: Modification + Cancellation) ----
  cocModifyService,
  cocCancelService,
  // ---- MAES — Material and Equipment Approval (MAES Enhancements SDD: Issuance + Renewal + Modification + Cancellation + Revocation) ----
  maesIssueService,
  maesRenewService,
  maesModifyService,
  maesCancelService,
  maesRevokeService,
];

export function getService(id: ServiceId): ServiceDefinition | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function listServices(): ServiceDefinition[] {
  return SERVICES;
}

export function listServicesByModule(module: Module): ServiceDefinition[] {
  return SERVICES.filter((s) => s.module === module);
}

export const MODULES: { id: Module; label: string; tagline: string }[] = [
  { id: 'gas', label: 'Gas Systems',         tagline: 'Operators, contractors & third-party inspection' },
  { id: 'hoe', label: 'House of Expertise',  tagline: 'Consultancies & expert-house registrations' },
  { id: 'noc', label: 'NOC',                 tagline: 'No Objection Certificate to operate gas systems at premises' },
  { id: 'amc', label: 'AMC for Gas Systems', tagline: 'Annual maintenance contracts between gas operators and building owners' },
  { id: 'coc', label: 'COC for Gas Systems', tagline: 'Modification & cancellation of the Certificate of Completion for an issued gas system' },
  { id: 'maes', label: 'MAES',               tagline: 'Material & Equipment Approval — per-material expiry, three-tier review, partial/full lifecycle actions' },
];

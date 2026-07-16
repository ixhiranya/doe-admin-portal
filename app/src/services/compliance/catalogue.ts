// =============================================================================
// Compliance · Violation Catalogue
// -----------------------------------------------------------------------------
// SDD §4.1 — the full list of permitted violation codes per permit type with
// titles, descriptions, default severity, base AED penalty, optional cap.
// Configurable in production; baseline catalogue seeded at go-live.
// The Violation record permanently binds to a catalogue version (SDD §8) so
// later edits do not retroactively change historical violations.
// =============================================================================

import type { ViolationCode, ViolationPermitType, ViolationSeverity } from '../../types';

export const CATALOGUE_VERSION = '2026-05-20';

/** Default repeat-offence window per SDD §4.3 — rolling 24 months. */
export const REPEAT_OFFENCE_WINDOW_MONTHS = 24;

/** Severity-to-multiplier table for the Penalty Engine — SDD §4.4. */
export const SEVERITY_MULTIPLIER: Record<ViolationSeverity, number> = {
  critical: 3.0,
  major: 1.5,
  minor: 1.0,
  informational: 0.0,
};

/** Offence-count multiplier — SDD §4.4 (default 1× / 2× / 3×). */
export function offenceCountMultiplier(offenceCount: number): number {
  if (offenceCount <= 1) return 1.0;
  if (offenceCount === 2) return 2.0;
  return 3.0;
}

/** Severity-band caps for per-virtual-record contribution — SDD §4.3. */
export const SEVERITY_SCORE_CAP: Record<ViolationSeverity, number> = {
  critical: 0,
  major: 40,
  minor: 70,
  informational: 100,
};

// ---------------------------------------------------------------------------
// The catalogue — 30 codes covering common offences across all permit types.
// ---------------------------------------------------------------------------
export const VIOLATION_CATALOGUE: ViolationCode[] = [
  // ─── Gas Systems Company Registration ──────────────────────────────────────
  {
    id: 'VC-GAS-001', code: 'GAS-OP-NO-PERMIT',
    applicablePermitTypes: ['gas_company_registration'],
    title: 'Operating gas systems without a valid permit',
    titleAr: 'تشغيل أنظمة الغاز دون تصريح ساري المفعول',
    description: 'A registered or unregistered entity is operating gas systems in Abu Dhabi without an active, in-scope Gas Systems Company permit.',
    defaultSeverity: 'critical', basePenaltyAed: 50_000, maxPenaltyAed: 200_000, vapThresholdOverride: true,
  },
  {
    id: 'VC-GAS-002', code: 'GAS-EXPIRED-PERMIT',
    applicablePermitTypes: ['gas_company_registration'],
    title: 'Operating after permit expiry',
    titleAr: 'التشغيل بعد انتهاء صلاحية التصريح',
    description: 'The Gas Systems Company permit has expired and operations are continuing without renewal.',
    defaultSeverity: 'major', basePenaltyAed: 20_000, maxPenaltyAed: 100_000,
  },
  {
    id: 'VC-GAS-003', code: 'GAS-SCOPE-BREACH',
    applicablePermitTypes: ['gas_company_registration'],
    title: 'Activity outside the permitted category scope',
    titleAr: 'مزاولة نشاط خارج نطاق فئة التصريح',
    description: 'Performing activities outside the Category A / B / C / D scope explicitly granted by the permit.',
    defaultSeverity: 'major', basePenaltyAed: 15_000,
  },
  {
    id: 'VC-GAS-004', code: 'GAS-UNLICENSED-SUBCONTRACT',
    applicablePermitTypes: ['gas_company_registration', 'amc'],
    title: 'Unlicensed sub-contracting of gas works',
    titleAr: 'التعاقد من الباطن مع جهات غير مرخصة لأعمال الغاز',
    description: 'Engaging a sub-contractor that does not hold a valid DoE-issued Gas Systems Company permit to perform gas works.',
    defaultSeverity: 'major', basePenaltyAed: 25_000, maxPenaltyAed: 75_000,
  },
  {
    id: 'VC-GAS-005', code: 'GAS-FALSIFIED-DOCS',
    applicablePermitTypes: ['gas_company_registration', 'hoe_tpi_registration', 'amc', 'noc', 'coc', 'maes'],
    title: 'Falsified documents submitted to DoE',
    titleAr: 'تقديم وثائق مزورة لدائرة الطاقة',
    description: 'Knowingly submitting forged, altered or fraudulent documents in any DoE PPS application or report.',
    defaultSeverity: 'critical', basePenaltyAed: 100_000, vapThresholdOverride: true,
  },

  // ─── HOE / TPI ─────────────────────────────────────────────────────────────
  {
    id: 'VC-HOE-001', code: 'HOE-NONCONFORM-FINDING',
    applicablePermitTypes: ['hoe_tpi_registration'],
    title: 'Conformity inspection non-conformity (HOE / TPI)',
    titleAr: 'عدم مطابقة في فحص المطابقة',
    description: 'TPI conformity inspection has returned a parameter-level non-conformity against an installed gas system.',
    defaultSeverity: 'major', basePenaltyAed: 12_000,
  },
  {
    id: 'VC-HOE-002', code: 'HOE-INSP-REPORT-LATE',
    applicablePermitTypes: ['hoe_tpi_registration'],
    title: 'Late TPI inspection report submission',
    titleAr: 'تأخر تقديم تقرير الفحص الفني',
    description: 'TPI inspection report submitted beyond the regulatory deadline.',
    defaultSeverity: 'minor', basePenaltyAed: 3_000,
  },
  {
    id: 'VC-HOE-003', code: 'HOE-ENG-NOT-REGISTERED',
    applicablePermitTypes: ['hoe_tpi_registration'],
    title: 'Inspection conducted by engineer not registered with HOE',
    titleAr: 'إجراء الفحص من قبل مهندس غير مسجل ببيت الخبرة',
    description: 'Conformity inspection signed off by an engineer who is not on the registered HOE roster.',
    defaultSeverity: 'major', basePenaltyAed: 18_000,
  },

  // ─── AMC ───────────────────────────────────────────────────────────────────
  {
    id: 'VC-AMC-001', code: 'AMC-MISSED-MAINT',
    applicablePermitTypes: ['amc'],
    title: 'Missed scheduled maintenance visit',
    titleAr: 'تفويت زيارة صيانة مجدولة',
    description: 'AMC service provider missed a scheduled maintenance visit per the contracted frequency.',
    defaultSeverity: 'minor', basePenaltyAed: 2_500,
  },
  {
    id: 'VC-AMC-002', code: 'AMC-INCOMPLETE-LOG',
    applicablePermitTypes: ['amc'],
    title: 'Incomplete maintenance log',
    titleAr: 'سجل صيانة غير مكتمل',
    description: 'Maintenance records missing required fields, signatures, or photos.',
    defaultSeverity: 'minor', basePenaltyAed: 1_500,
  },
  {
    id: 'VC-AMC-003', code: 'AMC-SAFETY-ITEM-UNRESOLVED',
    applicablePermitTypes: ['amc'],
    title: 'Critical safety item left unresolved between visits',
    titleAr: 'بند سلامة حرج لم يُعالج بين الزيارات',
    description: 'Critical safety issue flagged in a maintenance visit was not resolved before the next scheduled visit.',
    defaultSeverity: 'critical', basePenaltyAed: 40_000, vapThresholdOverride: true,
  },

  // ─── NOC ───────────────────────────────────────────────────────────────────
  {
    id: 'VC-NOC-001', code: 'NOC-NO-VALID-NOC',
    applicablePermitTypes: ['noc'],
    title: 'Operating gas system without valid NOC',
    titleAr: 'تشغيل نظام الغاز دون شهادة عدم ممانعة سارية',
    description: 'A gas system is in operation at a premises without a valid DoE No Objection Certificate.',
    defaultSeverity: 'major', basePenaltyAed: 30_000,
  },
  {
    id: 'VC-NOC-002', code: 'NOC-MODIFIED-NO-APPROVAL',
    applicablePermitTypes: ['noc'],
    title: 'Unauthorised modification to NOC-bound gas system',
    titleAr: 'تعديل غير مصرح به على نظام غاز مرتبط بشهادة عدم الممانعة',
    description: 'Modifications were made to a gas system without obtaining prior DoE written approval.',
    defaultSeverity: 'major', basePenaltyAed: 20_000,
  },
  {
    id: 'VC-NOC-003', code: 'NOC-CAPACITY-EXCEEDED',
    applicablePermitTypes: ['noc'],
    title: 'Storage capacity exceeded beyond NOC scope',
    titleAr: 'تجاوز السعة التخزينية لنطاق شهادة عدم الممانعة',
    description: 'Installed storage capacity exceeds the capacity declared and approved in the NOC.',
    defaultSeverity: 'critical', basePenaltyAed: 60_000, vapThresholdOverride: true,
  },

  // ─── COC ───────────────────────────────────────────────────────────────────
  {
    id: 'VC-COC-001', code: 'COC-WITHOUT-TPI',
    applicablePermitTypes: ['coc'],
    title: 'Certificate of Completion issued without TPI inspection',
    titleAr: 'إصدار شهادة إنجاز دون فحص الجهة الفاحصة',
    description: 'A Certificate of Completion was issued without the required Third-Party Inspection sign-off.',
    defaultSeverity: 'critical', basePenaltyAed: 80_000, vapThresholdOverride: true,
  },
  {
    id: 'VC-COC-002', code: 'COC-POST-MOD-NO-RECERT',
    applicablePermitTypes: ['coc'],
    title: 'Post-modification re-certification missing',
    titleAr: 'إعادة الفحص بعد التعديل غير منفذة',
    description: 'Gas-system modification was performed but a fresh CoC has not been obtained.',
    defaultSeverity: 'major', basePenaltyAed: 22_000,
  },

  // ─── MAES ──────────────────────────────────────────────────────────────────
  {
    id: 'VC-MAES-001', code: 'MAES-UNAPPROVED-MATERIAL',
    applicablePermitTypes: ['maes'],
    title: 'Unapproved material in use',
    titleAr: 'استخدام مادة غير معتمدة',
    description: 'Materials in use at the site are not present on the approved MAES register or have expired.',
    defaultSeverity: 'major', basePenaltyAed: 28_000,
  },
  {
    id: 'VC-MAES-002', code: 'MAES-EXPIRED-MATERIAL',
    applicablePermitTypes: ['maes'],
    title: 'Operating with expired MAES material registration',
    titleAr: 'العمل بمادة منتهية الصلاحية في سجل MAES',
    description: 'Material registration expired and the material is still in use without renewal.',
    defaultSeverity: 'minor', basePenaltyAed: 4_000,
  },

  // ─── Sampling / Testing ────────────────────────────────────────────────────
  {
    id: 'VC-LAB-001', code: 'LAB-SAMPLE-CRITICAL-FAIL',
    applicablePermitTypes: ['tadawel', 'gas_company_registration'],
    title: 'Sampling result — Critical Fail',
    titleAr: 'نتيجة العينة — فشل حرج',
    description: 'Approved-Fail result on a Critical parameter (e.g. lead, sulphur out of band) from the Sampling & Testing module.',
    defaultSeverity: 'critical', basePenaltyAed: 75_000, vapThresholdOverride: true,
  },
  {
    id: 'VC-LAB-002', code: 'LAB-SAMPLE-MAJOR-FAIL',
    applicablePermitTypes: ['tadawel', 'gas_company_registration'],
    title: 'Sampling result — Major Fail',
    titleAr: 'نتيجة العينة — فشل كبير',
    description: 'Approved-Fail result on a Major parameter from the Sampling & Testing module.',
    defaultSeverity: 'major', basePenaltyAed: 20_000,
  },
  {
    id: 'VC-LAB-003', code: 'LAB-SAMPLE-MINOR-FAIL',
    applicablePermitTypes: ['tadawel', 'gas_company_registration'],
    title: 'Sampling result — Minor Fail',
    titleAr: 'نتيجة العينة — فشل بسيط',
    description: 'Approved-Fail result on a Minor / out-of-tolerance parameter.',
    defaultSeverity: 'minor', basePenaltyAed: 3_500,
  },

  // ─── Incident Report ────────────────────────────────────────────────────────
  {
    id: 'VC-INC-001', code: 'INC-LEAK-NO-REPORT',
    applicablePermitTypes: ['noc', 'amc', 'gas_company_registration'],
    title: 'Gas leak not reported within mandated window',
    titleAr: 'تسرب الغاز لم يُبلَّغ خلال المدة المحددة',
    description: 'A confirmed gas leak / release was not reported to DoE within the regulatory window.',
    defaultSeverity: 'critical', basePenaltyAed: 90_000, vapThresholdOverride: true,
  },
  {
    id: 'VC-INC-002', code: 'INC-IGNORED-INCIDENT',
    applicablePermitTypes: ['noc', 'amc'],
    title: 'Incident response protocol not followed',
    titleAr: 'عدم اتباع بروتوكول الاستجابة للحادث',
    description: 'On-site personnel did not follow the documented incident response protocol after a gas-system event.',
    defaultSeverity: 'major', basePenaltyAed: 25_000,
  },

  // ─── Inspection (Mobile App) ───────────────────────────────────────────────
  {
    id: 'VC-INSP-001', code: 'INSP-CRITICAL-CHECK-FAIL',
    applicablePermitTypes: ['gas_company_registration', 'amc', 'noc', 'coc'],
    title: 'Critical inspection check failure',
    titleAr: 'فشل نقطة فحص حرجة',
    description: 'A Critical-flagged check on the mobile inspection scheme returned a Fail outcome.',
    defaultSeverity: 'critical', basePenaltyAed: 45_000, vapThresholdOverride: true,
  },
  {
    id: 'VC-INSP-002', code: 'INSP-REFUSE-ENTRY',
    applicablePermitTypes: ['gas_company_registration', 'amc', 'noc', 'coc'],
    title: 'Refusal of inspection',
    titleAr: 'رفض السماح بالتفتيش',
    description: 'Licensee refused entry to a duly-authorised DoE inspector.',
    defaultSeverity: 'major', basePenaltyAed: 35_000,
  },
  {
    id: 'VC-INSP-003', code: 'INSP-PPE-VIOLATION',
    applicablePermitTypes: ['gas_company_registration', 'amc'],
    title: 'PPE / on-site safety equipment missing',
    titleAr: 'نقص في معدات الوقاية الشخصية / السلامة',
    description: 'On-site personnel are operating without the mandated personal protective equipment.',
    defaultSeverity: 'minor', basePenaltyAed: 5_000,
  },
  {
    id: 'VC-INSP-004', code: 'INSP-RECORD-KEEPING',
    applicablePermitTypes: ['gas_company_registration', 'amc'],
    title: 'Inadequate record-keeping',
    titleAr: 'سجلات غير ملائمة',
    description: 'Maintenance / operations records are missing, incomplete or out of date.',
    defaultSeverity: 'minor', basePenaltyAed: 2_000,
  },
  {
    id: 'VC-INSP-005', code: 'INSP-LATE-CORRECTIVE',
    applicablePermitTypes: ['gas_company_registration', 'amc', 'noc', 'coc'],
    title: 'Failure to complete Corrective Action Plan',
    titleAr: 'عدم إكمال خطة الإجراءات التصحيحية',
    description: 'Corrective Action Plan committed to following an earlier Conditional renewal was not completed within the agreed window.',
    defaultSeverity: 'major', basePenaltyAed: 22_000,
  },
  {
    id: 'VC-INSP-006', code: 'INSP-REPEAT-MINOR',
    applicablePermitTypes: ['gas_company_registration', 'amc', 'noc', 'coc'],
    title: 'Repeated Minor non-compliance',
    titleAr: 'تكرار عدم الامتثال البسيط',
    description: 'A pattern of Minor findings on consecutive inspections — escalated under SDD §4.3 repeat-offence rules.',
    defaultSeverity: 'minor', basePenaltyAed: 3_000,
  },
];

export function getViolationCode(id: string): ViolationCode | undefined {
  return VIOLATION_CATALOGUE.find((v) => v.id === id);
}

export function listViolationCodesFor(permitType: ViolationPermitType): ViolationCode[] {
  return VIOLATION_CATALOGUE.filter((v) => v.applicablePermitTypes.includes(permitType));
}

/** Default per-source contribution weight for the rolling score — SDD §3.1. */
export const SOURCE_CONTRIBUTION_WEIGHT: Record<string, number> = {
  mobile_inspection: 1.0,
  tpi_conformity:    0.75,
  sampling_fail:     0.5,
  incident_report:   1.0,
  compliance_assessment: 1.0,
};

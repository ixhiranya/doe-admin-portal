import type { Locale } from '../store/locale';

// Flat-namespace translation dictionary. Keys are dot-path strings; lookup is
// the responsibility of the useT() hook. Keeping it flat (rather than nested
// objects) keeps autocomplete simple and means a missing key falls back to
// the literal key rather than crashing.

export type TKey =
  // common UI
  | 'common.signIn' | 'common.signOut' | 'common.cancel' | 'common.submit'
  | 'common.next' | 'common.previous' | 'common.search' | 'common.back'
  | 'common.loading' | 'common.noResults'
  | 'common.password' | 'common.username'
  | 'common.email' | 'common.mobile' | 'common.emiratesId'

  // language toggle
  | 'lang.toggle' | 'lang.english' | 'lang.arabic'

  // Login
  | 'login.faq' | 'login.guide' | 'login.notices' | 'login.register'
  | 'login.eyebrow' | 'login.titleLine1' | 'login.titleLine2' | 'login.lede'
  | 'login.bodyParagraph'
  | 'login.insights' | 'login.partners'
  | 'login.stat.energy' | 'login.stat.water' | 'login.stat.capacity'
  | 'login.stat.energyLabel' | 'login.stat.waterLabel' | 'login.stat.capacityLabel'
  | 'login.securePortal' | 'login.welcomeBack' | 'login.welcomeSubtitle'
  | 'login.internalStaff' | 'login.externalPartner'
  | 'login.keepSignedIn' | 'login.forgotPassword'
  | 'login.signInWithUaePass' | 'login.or'
  | 'login.userNamePlaceholder' | 'login.passwordPlaceholder'
  | 'login.itSupport'

  // Dashboard
  | 'dashboard.welcome' | 'dashboard.welcomeRole'
  | 'dashboard.breadcrumbHome' | 'dashboard.breadcrumbDashboard'
  | 'dashboard.inYourQueue' | 'dashboard.pendingReviews' | 'dashboard.notifications'
  | 'dashboard.awaitingAction' | 'dashboard.currentApplications' | 'dashboard.simulatedLog'

  // Customers (list page)
  | 'customers.breadcrumb' | 'customers.subtitle' | 'customers.heroEyebrow'
  | 'customers.heroTitle' | 'customers.heroLede'
  | 'customers.newCustomer'
  | 'customers.kpi.total' | 'customers.kpi.residential' | 'customers.kpi.commercial' | 'customers.kpi.combinedCapacity'
  | 'customers.filter.searchPlaceholder'
  | 'customers.filter.permitHolder' | 'customers.filter.city'
  | 'customers.filter.allSources' | 'customers.filter.allCities' | 'customers.filter.all'
  | 'customers.table.customer' | 'customers.table.permitAccount' | 'customers.table.source'
  | 'customers.table.business' | 'customers.table.capacity' | 'customers.table.contract'
  | 'customers.showing' | 'customers.of' | 'customers.sortedBy'
  | 'customers.empty.title' | 'customers.empty.body'
  | 'customers.gasTypes'
  | 'customers.business.residential' | 'customers.business.commercial'
  | 'customers.source.asateel' | 'customers.source.permit' | 'customers.source.manual'

  // ── Mobile Inspection app ────────────────────────────────────────────
  // Brand / shell
  | 'm.app.name' | 'm.app.subtitle' | 'm.app.deptOfEnergy'
  | 'm.shell.online' | 'm.shell.offline' | 'm.shell.live'
  // Splash
  | 'm.splash.tagline' | 'm.splash.authorised'
  // Sign-in
  | 'm.signin.welcomeBack' | 'm.signin.intro'
  | 'm.signin.account' | 'm.signin.pickAccount'
  | 'm.signin.continueWith' | 'm.signin.continueWithUaePass'
  | 'm.signin.useAd' | 'm.signin.adFallback' | 'm.signin.adUsername' | 'm.signin.adPassword'
  | 'm.signin.legalLine1' | 'm.signin.legalLine2'
  | 'm.signin.consentTitle' | 'm.signin.consentBody'
  | 'm.signin.signingInAs' | 'm.signin.continueToUaePass'
  | 'm.signin.verifying' | 'm.signin.handshake'
  // Home
  | 'm.home.greetingMorning' | 'm.home.greetingAfternoon' | 'm.home.greetingEvening'
  | 'm.home.salam' | 'm.home.upNext' | 'm.home.allStopsDone' | 'm.home.noPlan'
  | 'm.home.missionTitle' | 'm.home.todaysMission' | 'm.home.stopOf'
  | 'm.home.stopsLeft' | 'm.home.needsAction' | 'm.home.toGo'
  | 'm.home.upNextPill' | 'm.home.inspectThisStop' | 'm.home.resume'
  | 'm.home.editPlan' | 'm.home.reorderStops'
  | 'm.home.total' | 'm.home.remaining' | 'm.home.eta'
  | 'm.home.needsActionTitle' | 'm.home.live'
  | 'm.home.missionLive' | 'm.home.stopsProgressLabel' | 'm.home.stopsWord' | 'm.home.percentDone'
  | 'm.home.action.returnedTitle' | 'm.home.action.returnedSub'
  | 'm.home.action.criticalTitle' | 'm.home.action.criticalSub'
  | 'm.home.action.draftTitle' | 'm.home.action.draftSub'
  | 'm.home.weekTitle' | 'm.home.weekSubtitle' | 'm.home.inspections'
  | 'm.home.vsLastWeek' | 'm.home.avgScore'
  | 'm.home.recentActivity' | 'm.home.viewAll'
  | 'm.home.shortcuts' | 'm.home.shortcutsMap' | 'm.home.shortcutsMapSub'
  | 'm.home.shortcutsRoute' | 'm.home.shortcutsRouteSub'
  | 'm.home.shortcutsHistory' | 'm.home.shortcutsHistorySub'
  | 'm.home.shortcutsProfile' | 'm.home.shortcutsProfileSub'
  // Tab bar
  | 'm.tab.today' | 'm.tab.map' | 'm.tab.route' | 'm.tab.history' | 'm.tab.me'
  // Map
  | 'm.map.title' | 'm.map.results' | 'm.map.searchPlaceholder'
  | 'm.map.filterAll' | 'm.map.filterCompliant' | 'm.map.filterPartial' | 'm.map.filterAction'
  | 'm.map.you' | 'm.map.buildings' | 'm.map.matchCount'
  | 'm.map.addToToday' | 'm.map.scheduleFor' | 'm.map.openBuilding'
  // Building Quick-Look
  | 'm.building.title' | 'm.building.score' | 'm.building.actionRequired'
  | 'm.building.partial' | 'm.building.compliant' | 'm.building.criticalOpen'
  | 'm.building.permits' | 'm.building.property' | 'm.building.violations'
  | 'm.building.warnings' | 'm.building.actions'
  | 'm.building.uid' | 'm.building.type' | 'm.building.city' | 'm.building.licence'
  | 'm.building.owner' | 'm.building.fm' | 'm.building.contractor'
  | 'm.building.lastInspection' | 'm.building.recentInspections'
  | 'm.building.startInspection' | 'm.building.checkInRule'
  | 'm.building.geofenceInside' | 'm.building.geofenceOutside'
  | 'm.building.metresFrom' | 'm.building.simNear' | 'm.building.simFar'
  | 'm.building.overrideLabel' | 'm.building.overridePlaceholder'
  | 'm.building.overrideAudit'
  | 'm.building.continuePickType' | 'm.building.inspectionType'
  | 'm.building.checkInStart'
  | 'm.building.permitActive' | 'm.building.permitExpired' | 'm.building.permitGrace' | 'm.building.permitNotOnFile'
  | 'm.building.expires'
  // Inspection types
  | 'm.itype.routine' | 'm.itype.routineDesc'
  | 'm.itype.reinspection' | 'm.itype.reinspectionDesc'
  | 'm.itype.complaint' | 'm.itype.complaintDesc'
  | 'm.itype.spotcheck' | 'm.itype.spotcheckDesc'
  | 'm.itype.incident' | 'm.itype.incidentDesc'
  | 'm.itype.preapproval' | 'm.itype.preapprovalDesc'
  // History
  | 'm.history.title' | 'm.history.mine' | 'm.history.all'
  | 'm.history.empty' | 'm.history.emptyBody' | 'm.history.records'
  // Me / Profile
  | 'm.me.title' | 'm.me.activity'
  | 'm.me.inspectionsCompleted' | 'm.me.modules'
  | 'm.me.email' | 'm.me.mobile' | 'm.me.adId'
  | 'm.me.security' | 'm.me.securityBody'
  | 'm.me.device' | 'm.me.appVersion' | 'm.me.mdm' | 'm.me.outboxTtl'
  | 'm.me.signOut'
  // Route
  | 'm.route.title' | 'm.route.stops' | 'm.route.totalKm'
  | 'm.route.tspNote' | 'm.route.addBuildings'
  | 'm.route.getRoute' | 'm.route.editPlan' | 'm.route.startNav'
  | 'm.route.stopOrder' | 'm.route.from' | 'm.route.eta'
  // Inspection view (read-only)
  | 'm.ins.title' | 'm.ins.draftBanner' | 'm.ins.returnedBanner'
  | 'm.ins.continue' | 'm.ins.openResubmit'
  | 'm.ins.status' | 'm.ins.outcome' | 'm.ins.workflow'
  | 'm.ins.checklistSummary' | 'm.ins.violationsRecorded'
  | 'm.ins.pending'
  // Inspection wizard / checklist
  | 'm.wiz.checklistTitle' | 'm.wiz.progress'
  | 'm.wiz.section1' | 'm.wiz.section2' | 'm.wiz.section3' | 'm.wiz.section4'
  | 'm.wiz.section5' | 'm.wiz.section6' | 'm.wiz.section7'
  | 'm.wiz.reviewSignOff' | 'm.wiz.itemsRemaining'
  | 'm.wiz.allComplete' | 'm.wiz.violationsPending'
  | 'm.wiz.compliant' | 'm.wiz.warning' | 'm.wiz.violation' | 'm.wiz.na'
  | 'm.wiz.severity' | 'm.wiz.minor' | 'm.wiz.major' | 'm.wiz.critical'
  | 'm.wiz.observationsPlaceholder'
  // Violation form & misc wizard labels
  | 'm.vio.title' | 'm.vio.linkedItem' | 'm.vio.category' | 'm.vio.categorySub'
  | 'm.vio.description' | 'm.vio.descriptionPlaceholder'
  | 'm.vio.photos' | 'm.vio.photosRequired'
  | 'm.vio.witness' | 'm.vio.witnessOptional' | 'm.vio.witnessNamePlaceholder' | 'm.vio.witnessStatementPlaceholder'
  | 'm.vio.disposition' | 'm.vio.disp.warning' | 'm.vio.disp.fine' | 'm.vio.disp.cessation' | 'm.vio.disp.vap'
  | 'm.vio.criticalNote' | 'm.vio.repeatNote'
  | 'm.vio.registerNote'
  | 'm.vio.save'
  // Submitted / Done screen
  | 'm.done.escalated.title' | 'm.done.retained.title'
  | 'm.done.escalated.body1' | 'm.done.escalated.body2' | 'm.done.escalated.body3'
  | 'm.done.retained.body1' | 'm.done.retained.body2' | 'm.done.retained.body3'
  | 'm.done.summary' | 'm.done.violationRefs'
  | 'm.done.viewWeb'
  // Build wizard 'continue' / KV labels
  | 'm.wiz.inspectionNumber' | 'm.wiz.gpsDistance' | 'm.wiz.gpsOverride'
  | 'm.wiz.respPartyPresent' | 'm.wiz.amcVisible' | 'm.wiz.nocVisible' | 'm.wiz.briefingGiven'
  | 'm.wiz.priorNote'
  | 'm.wiz.recommendationsPlaceholder' | 'm.wiz.internalNotesPlaceholder'
  | 'm.wiz.signoffPromptOn' | 'm.wiz.signoffPromptOff'
  | 'm.wiz.routeRetainSub' | 'm.wiz.routeEscalateSub' | 'm.wiz.routeAlertNote'
  | 'm.wiz.notePlaceholder'
  | 'm.wiz.submitFailed'
  // Submission outcome screen
  | 'm.submit.escalated' | 'm.submit.retained'
  | 'm.submit.backToHome' | 'm.submit.viewDetail'
  // Common labels
  | 'm.common.viewAll' | 'm.common.back' | 'm.common.home' | 'm.common.continue'
  | 'm.common.cancel' | 'm.common.save' | 'm.common.confirm' | 'm.common.edit'
  | 'm.common.add' | 'm.common.remove' | 'm.common.required' | 'm.common.optional'
  | 'm.common.yes' | 'm.common.no'
  | 'm.common.tapToContinue'
  ;

type Dict = Partial<Record<TKey, string>>;

const en: Dict = {
  'common.signIn': 'Sign In',
  'common.signOut': 'Sign out',
  'common.cancel': 'Cancel',
  'common.submit': 'Submit',
  'common.next': 'Next →',
  'common.previous': '← Previous',
  'common.search': 'Search',
  'common.back': '‹ Back',
  'common.loading': 'Loading…',
  'common.noResults': 'No results',
  'common.password': 'Password',
  'common.username': 'User Name',
  'common.email': 'Email',
  'common.mobile': 'Mobile',
  'common.emiratesId': 'Emirates ID',

  'lang.toggle': 'عربي',
  'lang.english': 'English',
  'lang.arabic': 'العربية',

  'login.faq': 'Frequently Asked Questions',
  'login.guide': 'Guide — How to Register',
  'login.notices': 'Public Notices',
  'login.register': 'Public Register',
  'login.eyebrow': 'Department of Energy · Abu Dhabi',
  'login.titleLine1': 'Powering Abu Dhabi’s',
  'login.titleLine2': 'Energy Future',
  'login.lede': 'Official licensing & compliance portal for registered partners and internal staff.',
  'login.bodyParagraph': 'We issue licences for companies and organisations operating in the sector and monitor their compliance with quality standards, which, in turn, supports the Emirate’s goals to ensure the sustainability of energy sources.',
  'login.insights': 'Energy Sector Insights',
  'login.partners': 'In partnership with',
  'login.stat.energy': '94,506 GWh',
  'login.stat.water': '1,203 Million M3',
  'login.stat.capacity': '17,957 MW',
  'login.stat.energyLabel': 'Energy Generated',
  'login.stat.waterLabel': 'Total Water Produced',
  'login.stat.capacityLabel': 'Assets Available Capacity',
  'login.securePortal': 'Secure Portal · Active',
  'login.welcomeBack': 'Welcome back',
  'login.welcomeSubtitle': 'Sign in to your DoE Abu Dhabi account.',
  'login.internalStaff': 'Internal Staff',
  'login.externalPartner': 'External Partner',
  'login.keepSignedIn': 'Keep me signed in',
  'login.forgotPassword': 'Forgot password?',
  'login.signInWithUaePass': 'Sign in with UAE PASS',
  'login.or': 'or',
  'login.userNamePlaceholder': 'User Name',
  'login.passwordPlaceholder': 'Password',
  'login.itSupport': 'IT Support · helpdesk@doe.gov.ae · Ext. 1234',

  'dashboard.welcome': 'Welcome, {name}.',
  'dashboard.welcomeRole': '{role} · {modules}',
  'dashboard.breadcrumbHome': 'Home',
  'dashboard.breadcrumbDashboard': 'Dashboard',
  'dashboard.inYourQueue': 'In your queue',
  'dashboard.pendingReviews': 'Pending reviews',
  'dashboard.notifications': 'Notifications',
  'dashboard.awaitingAction': 'Awaiting your action',
  'dashboard.currentApplications': 'Current applications',
  'dashboard.simulatedLog': 'Simulated email & SMS log',

  'customers.breadcrumb': 'Customer Master',
  'customers.subtitle': 'Gas Consumers · Residential & Commercial',
  'customers.heroEyebrow': 'Gas Register · Customer Master',
  'customers.heroTitle': 'Every gas consumer on file.',
  'customers.heroLede': 'Residential households and commercial accounts contracted with each permit holder. Capacity is allocated by gas type and recorded against the building, account, and contract on file.',
  'customers.newCustomer': 'New customer',
  'customers.kpi.total': 'Customers on file',
  'customers.kpi.residential': 'Residential',
  'customers.kpi.commercial': 'Commercial',
  'customers.kpi.combinedCapacity': 'Combined capacity',
  'customers.filter.searchPlaceholder': 'Search by customer, permit holder, account, address, gas type…',
  'customers.filter.permitHolder': 'Permit holder',
  'customers.filter.city': 'City',
  'customers.filter.allSources': 'All sources',
  'customers.filter.allCities': 'All',
  'customers.filter.all': 'All',
  'customers.table.customer': 'Customer',
  'customers.table.permitAccount': 'Permit holder · account',
  'customers.table.source': 'Source',
  'customers.table.business': 'Business',
  'customers.table.capacity': 'Capacity',
  'customers.table.contract': 'Contract',
  'customers.showing': 'Showing',
  'customers.of': 'of',
  'customers.sortedBy': 'Sorted by permit holder · name',
  'customers.empty.title': 'No customers match these filters',
  'customers.empty.body': 'Try clearing the search or source filters.',
  'customers.gasTypes': '{n} gas types',
  'customers.business.residential': 'Residential',
  'customers.business.commercial': 'Commercial',
  'customers.source.asateel': 'Asateel',
  'customers.source.permit': 'Petroleum Permit',
  'customers.source.manual': 'Manual entry',

  // ── Mobile Inspection app ────────────────────────────────────────────
  'm.app.name': 'PPS Inspection',
  'm.app.subtitle': 'Inspection & Enforcement',
  'm.app.deptOfEnergy': 'Department of Energy · Abu Dhabi',
  'm.shell.online': 'Live',
  'm.shell.offline': 'Offline · outbox',
  'm.shell.live': 'Live',

  'm.splash.tagline': 'PPS Inspection & Enforcement',
  'm.splash.authorised': 'Authorised DoE personnel only',

  'm.signin.welcomeBack': 'Welcome back.',
  'm.signin.intro': 'Sign in with UAE Pass to start your inspections. Internal use only.',
  'm.signin.account': 'Account',
  'm.signin.pickAccount': 'Pick an account',
  'm.signin.continueWith': 'Continue with',
  'm.signin.continueWithUaePass': 'Continue with UAE Pass',
  'm.signin.useAd': 'Use AD username & password',
  'm.signin.adFallback': 'Username & password fallback when UAE Pass federation is unavailable.',
  'm.signin.adUsername': 'AD username',
  'm.signin.adPassword': 'Password',
  'm.signin.legalLine1': 'By continuing you agree all activity is logged on the',
  'm.signin.legalLine2': 'Unified Platform audit trail.',
  'm.signin.consentTitle': 'Continue with UAE Pass',
  'm.signin.consentBody': 'DoE PPS will receive your Emirates ID, name, mobile and email from UAE Pass.',
  'm.signin.signingInAs': 'Signing in as',
  'm.signin.continueToUaePass': 'Continue to UAE Pass',
  'm.signin.verifying': 'Verifying with UAE Pass…',
  'm.signin.handshake': 'Federated identity exchange in progress.',

  'm.home.greetingMorning': 'good morning',
  'm.home.greetingAfternoon': 'good afternoon',
  'm.home.greetingEvening': 'good evening',
  'm.home.salam': 'Salām, {name}.',
  'm.home.upNext': 'Up next: {name}.',
  'm.home.allStopsDone': 'All {count} stops done. Wrap up paperwork or browse other buildings.',
  'm.home.noPlan': 'No plan assigned today. Open the map to pick a building.',
  'm.home.missionTitle': "Today's mission",
  'm.home.todaysMission': "Today's mission",
  'm.home.stopOf': 'Stop {n} of {total}',
  'm.home.stopsLeft': 'Stops left',
  'm.home.needsAction': 'Needs action',
  'm.home.toGo': 'To go',
  'm.home.upNextPill': 'Up next',
  'm.home.inspectThisStop': 'Inspect this stop',
  'm.home.resume': 'Resume {ref}',
  'm.home.editPlan': 'Edit plan',
  'm.home.reorderStops': 'Reorder stops',
  'm.home.total': 'Total',
  'm.home.remaining': 'Remaining',
  'm.home.eta': 'ETA',
  'm.home.needsActionTitle': 'Needs action · {count}',
  'm.home.live': 'Live',
  'm.home.missionLive': 'Mission · live',
  'm.home.stopsProgressLabel': 'Today',
  'm.home.stopsWord': 'stops',
  'm.home.percentDone': 'done',
  'm.home.action.returnedTitle': '{building} · returned',
  'm.home.action.returnedSub': 'Section Head needs clarifications — resubmit',
  'm.home.action.criticalTitle': '{building} · critical open',
  'm.home.action.criticalSub': '{n} violation(s) on file — re-inspect today',
  'm.home.action.draftTitle': 'Resume {ref}',
  'm.home.action.draftSub': '{building} — paused',
  'm.home.weekTitle': 'Week at a glance',
  'm.home.weekSubtitle': 'Mon–Sun',
  'm.home.inspections': 'Inspections',
  'm.home.vsLastWeek': 'vs the same day last week',
  'm.home.avgScore': 'Avg score',
  'm.home.recentActivity': 'Recent activity',
  'm.home.viewAll': 'All →',
  'm.home.shortcuts': 'Shortcuts',
  'm.home.shortcutsMap': 'Map view',
  'm.home.shortcutsMapSub': 'Buildings near me',
  'm.home.shortcutsRoute': 'Plan a route',
  'm.home.shortcutsRouteSub': '{n} stops · {km} km',
  'm.home.shortcutsHistory': 'History',
  'm.home.shortcutsHistorySub': '{n} record(s)',
  'm.home.shortcutsProfile': 'My profile',
  'm.home.shortcutsProfileSub': 'Signature, device, sign out',

  'm.tab.today': 'Today',
  'm.tab.map': 'Map',
  'm.tab.route': 'Route',
  'm.tab.history': 'History',
  'm.tab.me': 'Me',

  'm.map.title': 'Buildings',
  'm.map.results': '{visible} of {total} match this filter',
  'm.map.searchPlaceholder': 'Search name, premises, owner…',
  'm.map.filterAll': 'All',
  'm.map.filterCompliant': 'Compliant',
  'm.map.filterPartial': 'Partial',
  'm.map.filterAction': 'Action',
  'm.map.you': 'You · Abu Dhabi',
  'm.map.buildings': 'Buildings near you',
  'm.map.matchCount': '{n} results',
  'm.map.addToToday': "Add to today's plan",
  'm.map.scheduleFor': 'Schedule for…',
  'm.map.openBuilding': 'Open',

  'm.building.title': 'Building',
  'm.building.score': 'Score',
  'm.building.actionRequired': 'Action required',
  'm.building.partial': 'Partial coverage',
  'm.building.compliant': 'Compliant',
  'm.building.criticalOpen': 'Critical open',
  'm.building.permits': 'Permits on file',
  'm.building.property': 'Property',
  'm.building.violations': 'Violations',
  'm.building.warnings': 'Warnings',
  'm.building.actions': 'Actions',
  'm.building.uid': 'Building UID',
  'm.building.type': 'Type',
  'm.building.city': 'City',
  'm.building.licence': 'Commercial Licence',
  'm.building.owner': 'Owner',
  'm.building.fm': 'FM Company',
  'm.building.contractor': 'Gas Contractor',
  'm.building.lastInspection': 'Last inspection',
  'm.building.recentInspections': 'Recent inspections at this building',
  'm.building.startInspection': 'Start inspection',
  'm.building.checkInRule': 'Arrival check-in is gated by geofence. Allowed radius {r} m.',
  'm.building.geofenceInside': 'Inside the geofence — check in to proceed.',
  'm.building.geofenceOutside': 'Outside the geofence — override required.',
  'm.building.metresFrom': '{m} m from building',
  'm.building.simNear': 'sim near',
  'm.building.simFar': 'sim far',
  'm.building.overrideLabel': 'Override reason · mandatory (min 10 chars)',
  'm.building.overridePlaceholder': 'Eg. Premises gate moved 80 m east; coordinates need DoE update.',
  'm.building.overrideAudit': '{n} chars · flagged in audit + on report header.',
  'm.building.continuePickType': 'Continue · Pick inspection type',
  'm.building.inspectionType': 'Inspection type',
  'm.building.checkInStart': 'Check in & Start',
  'm.building.permitActive': 'active',
  'm.building.permitExpired': 'expired',
  'm.building.permitGrace': 'grace',
  'm.building.permitNotOnFile': 'not on file',
  'm.building.expires': 'Exp: {date}',

  'm.itype.routine': 'Routine Scheduled Inspection',
  'm.itype.routineDesc': 'Periodic compliance check against the active AMC / NOC / COC.',
  'm.itype.reinspection': 'Re-Inspection',
  'm.itype.reinspectionDesc': 'Follow-up on a prior inspection that issued warnings or violations.',
  'm.itype.complaint': 'Complaint-Driven Inspection',
  'm.itype.complaintDesc': 'Initiated in response to a complaint or tip-off.',
  'm.itype.spotcheck': 'Spot Check',
  'm.itype.spotcheckDesc': 'Unannounced verification of a specific compliance aspect.',
  'm.itype.incident': 'Incident Response Inspection',
  'm.itype.incidentDesc': 'Initiated in response to an incident report.',
  'm.itype.preapproval': 'Pre-Approval Site Verification',
  'm.itype.preapprovalDesc': 'On-site verification preceding NOC, COC or MAES issuance.',

  'm.history.title': 'Inspection History',
  'm.history.mine': 'My inspections',
  'm.history.all': 'All',
  'm.history.empty': 'No inspections yet',
  'm.history.emptyBody': 'Open a building from the Map and tap Start Inspection.',
  'm.history.records': '{n} records',

  'm.me.title': 'Profile',
  'm.me.activity': 'My activity',
  'm.me.inspectionsCompleted': 'Inspections completed',
  'm.me.modules': 'Modules',
  'm.me.email': 'Email',
  'm.me.mobile': 'Mobile',
  'm.me.adId': 'AD ID',
  'm.me.security': 'Security',
  'm.me.securityBody': 'Sign-in is via DoE Active Directory or UAE Pass federation. Every action is bound to your identity in the audit trail.',
  'm.me.device': 'Device & app',
  'm.me.appVersion': 'App version',
  'm.me.mdm': 'Mobile device management',
  'm.me.outboxTtl': 'Offline outbox retention',
  'm.me.signOut': 'Sign out',

  'm.route.title': 'Route Plan',
  'm.route.stops': '{n} stops',
  'm.route.totalKm': '{km} km',
  'm.route.tspNote': 'Optimised via the Unified Platform routing API.',
  'm.route.addBuildings': 'Add buildings to plan',
  'm.route.getRoute': 'Get optimised route',
  'm.route.editPlan': 'Edit plan',
  'm.route.startNav': 'Start navigation',
  'm.route.stopOrder': 'Stop order',
  'm.route.from': 'From previous',
  'm.route.eta': 'ETA',

  'm.ins.title': 'Inspection',
  'm.ins.draftBanner': 'Draft in progress',
  'm.ins.returnedBanner': 'Returned by Section Head — please review comments and resubmit.',
  'm.ins.continue': 'Continue inspection',
  'm.ins.openResubmit': 'Open & resubmit',
  'm.ins.status': 'Status',
  'm.ins.outcome': 'Outcome',
  'm.ins.workflow': 'Workflow trail',
  'm.ins.checklistSummary': 'Checklist summary',
  'm.ins.violationsRecorded': 'Violations recorded · {n}',
  'm.ins.pending': 'pending',

  'm.wiz.checklistTitle': 'Inspection Checklist',
  'm.wiz.progress': '{done}/{total}',
  'm.wiz.section1': 'Section 1 · Inspection Header',
  'm.wiz.section2': 'Section 2 · Pre-Inspection Verification',
  'm.wiz.section3': 'Section 3 · Compliance Checklist',
  'm.wiz.section4': 'Section 4 · Open Prior Findings',
  'm.wiz.section5': 'Section 5 · General Observations',
  'm.wiz.section6': 'Section 6 · Inspector Sign-Off',
  'm.wiz.section7': 'Section 7 · Responsible Party Acknowledgement',
  'm.wiz.reviewSignOff': 'Review & sign-off',
  'm.wiz.itemsRemaining': '{n} item(s) remaining',
  'm.wiz.allComplete': 'All sections complete — ready to submit.',
  'm.wiz.violationsPending': '{n} violation form(s) pending',
  'm.wiz.compliant': 'Compliant',
  'm.wiz.warning': 'Warning',
  'm.wiz.violation': 'Violation',
  'm.wiz.na': 'N/A',
  'm.wiz.severity': 'Severity',
  'm.wiz.minor': 'Minor',
  'm.wiz.major': 'Major',
  'm.wiz.critical': 'Critical',
  'm.wiz.observationsPlaceholder': 'Observations (mandatory)',

  'm.submit.escalated': 'Escalated to Regulation Team',
  'm.submit.retained': 'Retained in inspection team',
  'm.submit.backToHome': 'Back to home',
  'm.submit.viewDetail': 'View detail',

  'm.common.viewAll': 'View all',
  'm.common.back': 'Back',
  'm.common.home': 'Home',
  'm.common.continue': 'Continue',
  'm.common.cancel': 'Cancel',
  'm.common.save': 'Save',
  'm.common.confirm': 'Confirm',
  'm.common.edit': 'Edit',
  'm.common.add': 'Add',
  'm.common.remove': 'Remove',
  'm.common.required': 'Required',
  'm.common.optional': 'Optional',
  'm.common.yes': 'Yes',
  'm.common.no': 'No',
  'm.common.tapToContinue': 'Tap to continue →',

  // Violation form
  'm.vio.title': 'Violation',
  'm.vio.linkedItem': 'Linked checklist item',
  'm.vio.category': 'Category',
  'm.vio.categorySub': 'Catalogue maintained in Compliance & Enforcement.',
  'm.vio.description': 'Description',
  'm.vio.descriptionPlaceholder': 'Free-text narrative of the observed violation (mandatory)',
  'm.vio.photos': 'Photo evidence',
  'm.vio.photosRequired': 'At least one live photo required.',
  'm.vio.witness': 'Witness statement',
  'm.vio.witnessOptional': 'Optional',
  'm.vio.witnessNamePlaceholder': 'Witness name / ID',
  'm.vio.witnessStatementPlaceholder': 'Statement from responsible party or third party',
  'm.vio.disposition': 'Initial disposition recommendation',
  'm.vio.disp.warning':   'Warning letter recommended',
  'm.vio.disp.fine':      'Administrative fine recommended',
  'm.vio.disp.cessation': 'Operations cessation recommended',
  'm.vio.disp.vap':       'Refer to VAP Committee',
  'm.vio.criticalNote':   'Critical: Senior Inspector co-sign required before approval. Section Head receives an alert within 5 min of submission.',
  'm.vio.repeatNote':     '{n}{suffix} recorded in this category (last 12 months).',
  'm.vio.registerNote':   'Violations are written to the centralized Violations Register on escalation.',
  'm.vio.save':           'Save violation',

  // Submitted / done
  'm.done.escalated.title': 'Escalated to Regulation Team',
  'm.done.retained.title':  'Retained in inspection team',
  'm.done.escalated.body1': 'All {n} violation(s) written to the Violations Register.',
  'm.done.escalated.body2': 'Section Head + Regulation Team notified.',
  'm.done.escalated.body3': 'VAP Committee will pick up the violations on the next scheduled agenda.',
  'm.done.retained.body1':  "Filed in the Senior Inspector's shared queue.",
  'm.done.retained.body2':  'Follow-up action created with target date {date}.',
  'm.done.retained.body3':  'No entry in the Violations Register.',
  'm.done.summary':         'Inspection summary',
  'm.done.violationRefs':   'Violation references',
  'm.done.viewWeb':         'Submission visible on the web app under',

  // Wizard KV / yes-no / sign-off / route choice labels
  'm.wiz.inspectionNumber':  'Inspection No.',
  'm.wiz.gpsDistance':       'GPS distance',
  'm.wiz.gpsOverride':       'OVERRIDE',
  'm.wiz.respPartyPresent':  'Responsible party present',
  'm.wiz.amcVisible':        'AMC visible on premises',
  'm.wiz.nocVisible':        'NOC visible on premises',
  'm.wiz.briefingGiven':     'Briefing given to responsible party',
  'm.wiz.priorNote':         '{n} prior finding(s) on this building. Recorded as carry-forward in this prototype.',
  'm.wiz.recommendationsPlaceholder': 'Recommendations to responsible party (optional)',
  'm.wiz.internalNotesPlaceholder':   'Internal notes (DoE only)',
  'm.wiz.signoffPromptOn':   '✓ Biometric verified',
  'm.wiz.signoffPromptOff':  'Tap to sign with biometric',
  'm.wiz.routeRetainSub':    'Filed in the Senior Inspector queue. Follow-up created automatically. No entry in the Violations Register.',
  'm.wiz.routeEscalateSub':  'Every violation is written to the centralized Violations Register and routed to VAP Committee.',
  'm.wiz.routeAlertNote':    '⚠ Section Head alert within 5 min.',
  'm.wiz.notePlaceholder':   'Additional context (optional)',
  'm.wiz.submitFailed':      'Failed to submit.',
};

const ar: Dict = {
  'common.signIn': 'تسجيل الدخول',
  'common.signOut': 'تسجيل الخروج',
  'common.cancel': 'إلغاء',
  'common.submit': 'إرسال',
  'common.next': 'التالي ←',
  'common.previous': '→ السابق',
  'common.search': 'بحث',
  'common.back': '› رجوع',
  'common.loading': 'جارٍ التحميل…',
  'common.noResults': 'لا توجد نتائج',
  'common.password': 'كلمة المرور',
  'common.username': 'اسم المستخدم',
  'common.email': 'البريد الإلكتروني',
  'common.mobile': 'الهاتف المحمول',
  'common.emiratesId': 'رقم الهوية الإماراتية',

  'lang.toggle': 'English',
  'lang.english': 'English',
  'lang.arabic': 'العربية',

  'login.faq': 'الأسئلة الشائعة',
  'login.guide': 'دليل التسجيل',
  'login.notices': 'الإعلانات العامة',
  'login.register': 'السجل العام',
  'login.eyebrow': 'دائرة الطاقة · أبوظبي',
  'login.titleLine1': 'نُمكّن مستقبل',
  'login.titleLine2': 'الطاقة في أبوظبي',
  'login.lede': 'البوابة الرسمية للتراخيص والامتثال لشركاء المنظومة وموظفي الدائرة.',
  'login.bodyParagraph': 'نُصدر التراخيص للشركات والمؤسسات العاملة في القطاع، ونراقب التزامها بمعايير الجودة، بما يدعم أهداف الإمارة في ضمان استدامة مصادر الطاقة.',
  'login.insights': 'مؤشرات قطاع الطاقة',
  'login.partners': 'بالشراكة مع',
  'login.stat.energy': '94,506 جيجاواط',
  'login.stat.water': '1,203 مليون م³',
  'login.stat.capacity': '17,957 ميغاواط',
  'login.stat.energyLabel': 'الطاقة المُنتجة',
  'login.stat.waterLabel': 'إجمالي المياه المُنتجة',
  'login.stat.capacityLabel': 'السعة المتاحة',
  'login.securePortal': 'بوابة آمنة · نشطة',
  'login.welcomeBack': 'مرحبًا بعودتك',
  'login.welcomeSubtitle': 'سجّل الدخول إلى حسابك في دائرة الطاقة - أبوظبي.',
  'login.internalStaff': 'موظفو الدائرة',
  'login.externalPartner': 'شريك خارجي',
  'login.keepSignedIn': 'إبقائي مسجّلاً',
  'login.forgotPassword': 'نسيت كلمة المرور؟',
  'login.signInWithUaePass': 'الدخول عبر UAE PASS',
  'login.or': 'أو',
  'login.userNamePlaceholder': 'اسم المستخدم',
  'login.passwordPlaceholder': 'كلمة المرور',
  'login.itSupport': 'الدعم الفني · helpdesk@doe.gov.ae · تحويلة 1234',

  'dashboard.welcome': 'مرحبًا، {name}.',
  'dashboard.welcomeRole': '{role} · {modules}',
  'dashboard.breadcrumbHome': 'الرئيسية',
  'dashboard.breadcrumbDashboard': 'لوحة التحكم',
  'dashboard.inYourQueue': 'في انتظارك',
  'dashboard.pendingReviews': 'مراجعات معلّقة',
  'dashboard.notifications': 'الإشعارات',
  'dashboard.awaitingAction': 'بانتظار إجرائك',
  'dashboard.currentApplications': 'الطلبات الحالية',
  'dashboard.simulatedLog': 'سجلّ بريد ورسائل تجريبي',

  'customers.breadcrumb': 'سجل العملاء',
  'customers.subtitle': 'مستهلكو الغاز · سكنية وتجارية',
  'customers.heroEyebrow': 'سجل الغاز · سجل العملاء',
  'customers.heroTitle': 'كل مستهلك للغاز في سجل واحد.',
  'customers.heroLede': 'الحسابات السكنية والتجارية المتعاقد عليها مع كل جهة مرخصة. تُسجَّل السعة لكل نوع غاز ومرتبطة بالمبنى والحساب والعقد.',
  'customers.newCustomer': 'عميل جديد',
  'customers.kpi.total': 'إجمالي العملاء',
  'customers.kpi.residential': 'سكني',
  'customers.kpi.commercial': 'تجاري',
  'customers.kpi.combinedCapacity': 'السعة الإجمالية',
  'customers.filter.searchPlaceholder': 'ابحث باسم العميل، الجهة المرخصة، الحساب، العنوان، أو نوع الغاز…',
  'customers.filter.permitHolder': 'الجهة المرخصة',
  'customers.filter.city': 'المدينة',
  'customers.filter.allSources': 'كل المصادر',
  'customers.filter.allCities': 'الكل',
  'customers.filter.all': 'الكل',
  'customers.table.customer': 'العميل',
  'customers.table.permitAccount': 'الجهة المرخصة · الحساب',
  'customers.table.source': 'المصدر',
  'customers.table.business': 'نوع النشاط',
  'customers.table.capacity': 'السعة',
  'customers.table.contract': 'العقد',
  'customers.showing': 'عرض',
  'customers.of': 'من',
  'customers.sortedBy': 'مرتّب حسب الجهة المرخصة · الاسم',
  'customers.empty.title': 'لا توجد نتائج مطابقة',
  'customers.empty.body': 'جرّب إزالة عوامل التصفية أو البحث.',
  'customers.gasTypes': '{n} أنواع غاز',
  'customers.business.residential': 'سكني',
  'customers.business.commercial': 'تجاري',
  'customers.source.asateel': 'أصاتيل',
  'customers.source.permit': 'تصريح بترولي',
  'customers.source.manual': 'إدخال يدوي',

  // ── Mobile Inspection app ────────────────────────────────────────────
  'm.app.name': 'تفتيش المنتجات البترولية',
  'm.app.subtitle': 'التفتيش والإنفاذ',
  'm.app.deptOfEnergy': 'دائرة الطاقة · أبوظبي',
  'm.shell.online': 'متصل',
  'm.shell.offline': 'غير متصل · قائمة الانتظار',
  'm.shell.live': 'مباشر',

  'm.splash.tagline': 'تفتيش وإنفاذ المنتجات البترولية',
  'm.splash.authorised': 'لموظفي دائرة الطاقة المعتمدين فقط',

  'm.signin.welcomeBack': 'أهلاً بعودتك.',
  'm.signin.intro': 'سجّل الدخول عبر الهوية الرقمية لبدء التفتيشات. للاستخدام الداخلي فقط.',
  'm.signin.account': 'الحساب',
  'm.signin.pickAccount': 'اختر حساباً',
  'm.signin.continueWith': 'المتابعة عبر',
  'm.signin.continueWithUaePass': 'المتابعة عبر الهوية الرقمية',
  'm.signin.useAd': 'استخدم اسم المستخدم وكلمة المرور',
  'm.signin.adFallback': 'بديل اسم المستخدم وكلمة المرور عند تعذّر الهوية الرقمية.',
  'm.signin.adUsername': 'اسم المستخدم',
  'm.signin.adPassword': 'كلمة المرور',
  'm.signin.legalLine1': 'بمتابعتك توافق على تسجيل جميع الإجراءات على',
  'm.signin.legalLine2': 'سجل التدقيق في المنصة الموحدة.',
  'm.signin.consentTitle': 'المتابعة عبر الهوية الرقمية',
  'm.signin.consentBody': 'ستتلقى دائرة الطاقة هويتك الإماراتية واسمك ورقم هاتفك وبريدك من الهوية الرقمية.',
  'm.signin.signingInAs': 'تسجيل الدخول باسم',
  'm.signin.continueToUaePass': 'المتابعة إلى الهوية الرقمية',
  'm.signin.verifying': 'جاري التحقق عبر الهوية الرقمية…',
  'm.signin.handshake': 'تبادل الهوية الموحّد قيد التنفيذ.',

  'm.home.greetingMorning': 'صباح الخير',
  'm.home.greetingAfternoon': 'مساء الخير',
  'm.home.greetingEvening': 'مساء الخير',
  'm.home.salam': 'مرحباً، {name}.',
  'm.home.upNext': 'المحطة التالية: {name}.',
  'm.home.allStopsDone': 'تم إكمال جميع المحطات ({count}). أنهِ الأوراق أو تصفّح المباني.',
  'm.home.noPlan': 'لا توجد خطة مُسندة اليوم. افتح الخريطة لاختيار مبنى.',
  'm.home.missionTitle': 'مهمة اليوم',
  'm.home.todaysMission': 'مهمة اليوم',
  'm.home.stopOf': 'المحطة {n} من {total}',
  'm.home.stopsLeft': 'محطات متبقية',
  'm.home.needsAction': 'تتطلب إجراء',
  'm.home.toGo': 'المسافة المتبقية',
  'm.home.upNextPill': 'التالي',
  'm.home.inspectThisStop': 'افحص هذه المحطة',
  'm.home.resume': 'استئناف {ref}',
  'm.home.editPlan': 'تعديل الخطة',
  'm.home.reorderStops': 'إعادة ترتيب المحطات',
  'm.home.total': 'الإجمالي',
  'm.home.remaining': 'المتبقي',
  'm.home.eta': 'الوصول',
  'm.home.needsActionTitle': 'يتطلب إجراء · {count}',
  'm.home.live': 'مباشر',
  'm.home.missionLive': 'المهمة · مباشر',
  'm.home.stopsProgressLabel': 'اليوم',
  'm.home.stopsWord': 'محطات',
  'm.home.percentDone': 'منجز',
  'm.home.action.returnedTitle': '{building} · معاد للتعديل',
  'm.home.action.returnedSub': 'يحتاج رئيس القسم توضيحات — أعد التقديم',
  'm.home.action.criticalTitle': '{building} · مخالفة حرجة مفتوحة',
  'm.home.action.criticalSub': '{n} مخالفة مسجّلة — أعد التفتيش اليوم',
  'm.home.action.draftTitle': 'استئناف {ref}',
  'm.home.action.draftSub': '{building} — موقوف',
  'm.home.weekTitle': 'نظرة على الأسبوع',
  'm.home.weekSubtitle': 'الإثنين–الأحد',
  'm.home.inspections': 'التفتيشات',
  'm.home.vsLastWeek': 'مقارنة باليوم نفسه من الأسبوع الماضي',
  'm.home.avgScore': 'متوسط النتيجة',
  'm.home.recentActivity': 'النشاط الأخير',
  'm.home.viewAll': 'الكل →',
  'm.home.shortcuts': 'الاختصارات',
  'm.home.shortcutsMap': 'عرض الخريطة',
  'm.home.shortcutsMapSub': 'المباني القريبة منك',
  'm.home.shortcutsRoute': 'تخطيط مسار',
  'm.home.shortcutsRouteSub': '{n} محطات · {km} كم',
  'm.home.shortcutsHistory': 'السجل',
  'm.home.shortcutsHistorySub': '{n} سجل',
  'm.home.shortcutsProfile': 'ملفّي الشخصي',
  'm.home.shortcutsProfileSub': 'التوقيع والجهاز وتسجيل الخروج',

  'm.tab.today': 'اليوم',
  'm.tab.map': 'الخريطة',
  'm.tab.route': 'المسار',
  'm.tab.history': 'السجل',
  'm.tab.me': 'حسابي',

  'm.map.title': 'المباني',
  'm.map.results': '{visible} من {total} تطابق التصفية',
  'm.map.searchPlaceholder': 'ابحث بالاسم أو رقم المبنى أو المالك…',
  'm.map.filterAll': 'الكل',
  'm.map.filterCompliant': 'ممتثل',
  'm.map.filterPartial': 'جزئي',
  'm.map.filterAction': 'يتطلب إجراء',
  'm.map.you': 'أنت · أبوظبي',
  'm.map.buildings': 'المباني القريبة منك',
  'm.map.matchCount': '{n} نتيجة',
  'm.map.addToToday': 'أضف إلى خطة اليوم',
  'm.map.scheduleFor': 'جدولة لتاريخ…',
  'm.map.openBuilding': 'فتح',

  'm.building.title': 'المبنى',
  'm.building.score': 'النتيجة',
  'm.building.actionRequired': 'يتطلب إجراء',
  'm.building.partial': 'تغطية جزئية',
  'm.building.compliant': 'ممتثل',
  'm.building.criticalOpen': 'مخالفة حرجة مفتوحة',
  'm.building.permits': 'التصاريح المسجّلة',
  'm.building.property': 'بيانات المبنى',
  'm.building.violations': 'المخالفات',
  'm.building.warnings': 'الإنذارات',
  'm.building.actions': 'الإجراءات',
  'm.building.uid': 'رقم المبنى',
  'm.building.type': 'النوع',
  'm.building.city': 'المدينة',
  'm.building.licence': 'الرخصة التجارية',
  'm.building.owner': 'المالك',
  'm.building.fm': 'شركة الإدارة',
  'm.building.contractor': 'مقاول الغاز',
  'm.building.lastInspection': 'آخر تفتيش',
  'm.building.recentInspections': 'التفتيشات الأخيرة لهذا المبنى',
  'm.building.startInspection': 'بدء التفتيش',
  'm.building.checkInRule': 'تسجيل الوصول مرتبط بالنطاق الجغرافي. النصف القُطر المسموح {r} م.',
  'm.building.geofenceInside': 'داخل النطاق — سجّل الدخول للمتابعة.',
  'm.building.geofenceOutside': 'خارج النطاق — يلزم تجاوز مع سبب.',
  'm.building.metresFrom': '{m} م من المبنى',
  'm.building.simNear': 'محاكاة قريب',
  'm.building.simFar': 'محاكاة بعيد',
  'm.building.overrideLabel': 'سبب التجاوز · إلزامي (10 أحرف فأكثر)',
  'm.building.overridePlaceholder': 'مثال: انتقلت بوابة المبنى 80م شرقاً؛ تحتاج الإحداثيات تحديثاً.',
  'm.building.overrideAudit': '{n} حرف · يُسجَّل في سجل التدقيق ورأس التقرير.',
  'm.building.continuePickType': 'متابعة · اختر نوع التفتيش',
  'm.building.inspectionType': 'نوع التفتيش',
  'm.building.checkInStart': 'تسجيل الدخول والبدء',
  'm.building.permitActive': 'فعّال',
  'm.building.permitExpired': 'منتهي',
  'm.building.permitGrace': 'فترة سماح',
  'm.building.permitNotOnFile': 'غير مسجّل',
  'm.building.expires': 'الانتهاء: {date}',

  'm.itype.routine': 'تفتيش دوري مجدول',
  'm.itype.routineDesc': 'فحص الامتثال الدوري وفق العقود والتصاريح السارية.',
  'm.itype.reinspection': 'تفتيش متابعة',
  'm.itype.reinspectionDesc': 'متابعة لتفتيش سابق تضمّن إنذارات أو مخالفات.',
  'm.itype.complaint': 'تفتيش بناءً على شكوى',
  'm.itype.complaintDesc': 'يُجرى رداً على شكوى أو بلاغ.',
  'm.itype.spotcheck': 'تفتيش فوري',
  'm.itype.spotcheckDesc': 'تحقّق غير معلن من جانب محدّد من الامتثال.',
  'm.itype.incident': 'تفتيش الاستجابة لحادث',
  'm.itype.incidentDesc': 'يُجرى رداً على بلاغ حادث.',
  'm.itype.preapproval': 'تحقّق ميداني قبل الموافقة',
  'm.itype.preapprovalDesc': 'تحقّق ميداني تمهيداً لإصدار رخصة جديدة.',

  'm.history.title': 'سجل التفتيشات',
  'm.history.mine': 'تفتيشاتي',
  'm.history.all': 'الكل',
  'm.history.empty': 'لا توجد تفتيشات بعد',
  'm.history.emptyBody': 'افتح مبنىً من الخريطة واضغط ابدأ التفتيش.',
  'm.history.records': '{n} سجل',

  'm.me.title': 'الملف الشخصي',
  'm.me.activity': 'نشاطي',
  'm.me.inspectionsCompleted': 'تفتيشات مُكتمَلة',
  'm.me.modules': 'الوحدات',
  'm.me.email': 'البريد الإلكتروني',
  'm.me.mobile': 'الهاتف',
  'm.me.adId': 'رقم الدليل النشط',
  'm.me.security': 'الأمان',
  'm.me.securityBody': 'تسجيل الدخول عبر الدليل النشط أو الهوية الرقمية. كل إجراء مرتبط بهويتك في سجل التدقيق.',
  'm.me.device': 'الجهاز والتطبيق',
  'm.me.appVersion': 'إصدار التطبيق',
  'm.me.mdm': 'إدارة الأجهزة المحمولة',
  'm.me.outboxTtl': 'مدة الاحتفاظ بالقائمة دون اتصال',
  'm.me.signOut': 'تسجيل الخروج',

  'm.route.title': 'تخطيط المسار',
  'm.route.stops': '{n} محطات',
  'm.route.totalKm': '{km} كم',
  'm.route.tspNote': 'مُحسَّن عبر واجهة المسارات في المنصة الموحدة.',
  'm.route.addBuildings': 'أضف مباني إلى الخطة',
  'm.route.getRoute': 'احسب المسار المُحسَّن',
  'm.route.editPlan': 'تعديل الخطة',
  'm.route.startNav': 'بدء الملاحة',
  'm.route.stopOrder': 'ترتيب المحطات',
  'm.route.from': 'من السابق',
  'm.route.eta': 'الوصول',

  'm.ins.title': 'التفتيش',
  'm.ins.draftBanner': 'مسوّدة قيد العمل',
  'm.ins.returnedBanner': 'أُعيدت من رئيس القسم — راجع التعليقات وأعد التقديم.',
  'm.ins.continue': 'متابعة التفتيش',
  'm.ins.openResubmit': 'فتح وإعادة تقديم',
  'm.ins.status': 'الحالة',
  'm.ins.outcome': 'النتيجة',
  'm.ins.workflow': 'سجل سير العمل',
  'm.ins.checklistSummary': 'ملخّص قائمة التحقق',
  'm.ins.violationsRecorded': 'المخالفات المسجّلة · {n}',
  'm.ins.pending': 'بانتظار',

  'm.wiz.checklistTitle': 'قائمة تحقّق التفتيش',
  'm.wiz.progress': '{done}/{total}',
  'm.wiz.section1': 'القسم 1 · رأس التفتيش',
  'm.wiz.section2': 'القسم 2 · التحقّق المسبق',
  'm.wiz.section3': 'القسم 3 · قائمة الامتثال',
  'm.wiz.section4': 'القسم 4 · النتائج السابقة',
  'm.wiz.section5': 'القسم 5 · ملاحظات عامة',
  'm.wiz.section6': 'القسم 6 · توقيع المفتش',
  'm.wiz.section7': 'القسم 7 · إقرار المسؤول',
  'm.wiz.reviewSignOff': 'المراجعة والتوقيع',
  'm.wiz.itemsRemaining': 'متبقي {n} عنصر',
  'm.wiz.allComplete': 'اكتملت جميع الأقسام — جاهز للتقديم.',
  'm.wiz.violationsPending': '{n} استمارة مخالفة بانتظار التعبئة',
  'm.wiz.compliant': 'ممتثل',
  'm.wiz.warning': 'إنذار',
  'm.wiz.violation': 'مخالفة',
  'm.wiz.na': 'لا ينطبق',
  'm.wiz.severity': 'الجسامة',
  'm.wiz.minor': 'بسيطة',
  'm.wiz.major': 'كبيرة',
  'm.wiz.critical': 'حرجة',
  'm.wiz.observationsPlaceholder': 'الملاحظات (إلزامية)',

  'm.submit.escalated': 'تم التصعيد إلى فريق التنظيم',
  'm.submit.retained': 'تم الاحتفاظ به ضمن فريق التفتيش',
  'm.submit.backToHome': 'العودة للرئيسية',
  'm.submit.viewDetail': 'عرض التفاصيل',

  'm.common.viewAll': 'عرض الكل',
  'm.common.back': 'رجوع',
  'm.common.home': 'الرئيسية',
  'm.common.continue': 'متابعة',
  'm.common.cancel': 'إلغاء',
  'm.common.save': 'حفظ',
  'm.common.confirm': 'تأكيد',
  'm.common.edit': 'تعديل',
  'm.common.add': 'إضافة',
  'm.common.remove': 'إزالة',
  'm.common.required': 'إلزامي',
  'm.common.optional': 'اختياري',
  'm.common.yes': 'نعم',
  'm.common.no': 'لا',
  'm.common.tapToContinue': 'اضغط للمتابعة ←',

  // Violation form
  'm.vio.title': 'مخالفة',
  'm.vio.linkedItem': 'بند قائمة التحقق المرتبط',
  'm.vio.category': 'الفئة',
  'm.vio.categorySub': 'يُدار الكتالوج في وحدة الامتثال والإنفاذ.',
  'm.vio.description': 'الوصف',
  'm.vio.descriptionPlaceholder': 'وصف نصي للمخالفة المرصودة (إلزامي)',
  'm.vio.photos': 'الأدلة المصورة',
  'm.vio.photosRequired': 'يلزم صورة حيّة واحدة على الأقل.',
  'm.vio.witness': 'إفادة شاهد',
  'm.vio.witnessOptional': 'اختياري',
  'm.vio.witnessNamePlaceholder': 'اسم الشاهد / الهوية',
  'm.vio.witnessStatementPlaceholder': 'إفادة من المسؤول أو طرف ثالث',
  'm.vio.disposition': 'التوصية الأولية',
  'm.vio.disp.warning':   'يوصى بإرسال إنذار',
  'm.vio.disp.fine':      'يوصى بغرامة إدارية',
  'm.vio.disp.cessation': 'يوصى بإيقاف العمليات',
  'm.vio.disp.vap':       'الإحالة إلى لجنة المخالفات والعقوبات',
  'm.vio.criticalNote':   'حرجة: يلزم توقيع المفتش الأول قبل الاعتماد. يصل تنبيه لرئيس القسم خلال 5 دقائق من التقديم.',
  'm.vio.repeatNote':     'هذه المرة {n}{suffix} لتسجيل هذه الفئة (آخر 12 شهراً).',
  'm.vio.registerNote':   'تُسجَّل المخالفات في سجل المخالفات المركزي عند التصعيد.',
  'm.vio.save':           'حفظ المخالفة',

  // Submitted / done
  'm.done.escalated.title': 'تم التصعيد إلى فريق التنظيم',
  'm.done.retained.title':  'تم الاحتفاظ به ضمن فريق التفتيش',
  'm.done.escalated.body1': 'تم تسجيل جميع المخالفات ({n}) في سجل المخالفات.',
  'm.done.escalated.body2': 'تم إخطار رئيس القسم وفريق التنظيم.',
  'm.done.escalated.body3': 'ستتولى لجنة المخالفات والعقوبات الملف في الاجتماع التالي.',
  'm.done.retained.body1':  'تم حفظه في طابور المفتش الأول.',
  'm.done.retained.body2':  'تم إنشاء إجراء متابعة بتاريخ مستهدف {date}.',
  'm.done.retained.body3':  'لا يوجد تسجيل في سجل المخالفات.',
  'm.done.summary':         'ملخّص التفتيش',
  'm.done.violationRefs':   'مراجع المخالفات',
  'm.done.viewWeb':         'يظهر التقديم في تطبيق الويب على',

  // Wizard misc
  'm.wiz.inspectionNumber':  'رقم التفتيش',
  'm.wiz.gpsDistance':       'مسافة GPS',
  'm.wiz.gpsOverride':       'تجاوز',
  'm.wiz.respPartyPresent':  'وجود المسؤول',
  'm.wiz.amcVisible':        'عقد الصيانة معروض في الموقع',
  'm.wiz.nocVisible':        'عدم الممانعة معروض في الموقع',
  'm.wiz.briefingGiven':     'تم تقديم الإحاطة للمسؤول',
  'm.wiz.priorNote':         '{n} نتيجة سابقة في هذا المبنى. مُسجَّلة كمرحَّلة في هذا النموذج التجريبي.',
  'm.wiz.recommendationsPlaceholder': 'توصيات للمسؤول (اختياري)',
  'm.wiz.internalNotesPlaceholder':   'ملاحظات داخلية (دائرة الطاقة فقط)',
  'm.wiz.signoffPromptOn':   '✓ تم التحقّق بالبصمة',
  'm.wiz.signoffPromptOff':  'اضغط للتوقيع بالبصمة',
  'm.wiz.routeRetainSub':    'يُحفظ في طابور المفتش الأول. يتم إنشاء متابعة تلقائياً. لا يوجد تسجيل في سجل المخالفات.',
  'm.wiz.routeEscalateSub':  'تُسجَّل كل مخالفة في سجل المخالفات المركزي وتُحال إلى لجنة المخالفات.',
  'm.wiz.routeAlertNote':    '⚠ تنبيه لرئيس القسم خلال 5 دقائق.',
  'm.wiz.notePlaceholder':   'سياق إضافي (اختياري)',
  'm.wiz.submitFailed':      'فشل التقديم.',
};

export const translations: Record<Locale, Dict> = { en, ar };

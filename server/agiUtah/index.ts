/**
 * AGI Utah module — public surface.
 *
 * NOTE: nothing in the running app imports this yet. Importing it registers the AgiUtah*
 * Mongoose models (on their own `agiutah_*` collections) but performs no writes and touches no
 * existing data. All behaviour remains gated behind the off-by-default feature flags in
 * ./config/featureFlags, and the HTTP router 404s unless AGI_UTAH_ENABLED is on.
 */

// Types + config
export * from './types';
export * from './config/featureFlags';

// Models
export * from './models/domainEvent';
export * from './models/program';
export * from './models/course';
export * from './models/courseProgramLink';
export * from './models/credentialDefinition';
export * from './models/academicSpine';
export * from './models/intake';
export * from './models/courseOffering';
export * from './models/programEnrollment';
export * from './models/courseEnrollment';
export * from './models/liveSession';
export * from './models/attendance';
export * from './models/credentialRecord';
export * from './models/sapStatus';
export * from './models/submission';
export * from './models/examAttempt';
export * from './models/financialAccount';
export * from './models/localizationProfile';
export * from './models/bridgeCohort';

// Pure logic
export * from './lib/strictNesting';
export * from './lib/credentialLogic';
export * from './lib/calendar';
export * from './lib/grading';
export * from './lib/eligibility';
export * from './lib/sap';
export * from './lib/refund';
export * from './lib/billing';
export * from './lib/contactClassification';
export * from './lib/inactivity';
export * from './lib/pricing';

// Catalog + loader
export * from './loader/catalogTypes';
export * from './loader/validateCatalog';
export * from './loader/loadCatalog';
export * from './catalog/agiUtahCatalog';

// Adapters (interface + Console stub + env selector)
export * from './adapters/conferencing';
export * from './adapters/credentialIssuer';
export * from './adapters/proctoring';
export * from './adapters/originality';
export * from './adapters/aiTutor';

// Services
export * from './services/emitEvent';
export * from './services/bootstrapService';
export * from './services/schedulerService';
export * from './services/enrollmentService';
export * from './services/gradingService';
export * from './services/attendanceService';
export * from './services/credentialService';
export * from './services/sapService';
export * from './services/contactLedgerService';

// HTTP (self-contained router; not mounted by this module)
export * from './http/agiUtahRouter';

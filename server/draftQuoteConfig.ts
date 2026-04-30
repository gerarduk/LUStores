// Configuration for session-based draft quote management
export const DRAFT_QUOTE_CONFIG = {
  // How long drafts last with activity (in milliseconds)
  EXPIRY_HOURS: 4,
  EXPIRY_MS: 4 * 60 * 60 * 1000, // 4 hours
  
  // How long to keep drafts for potential migration to new sessions
  MIGRATION_HOURS: 24,
  MIGRATION_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // How often to run cleanup (in minutes)
  CLEANUP_INTERVAL_MINUTES: 60,
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
  
  // Maximum number of draft quotes per user to prevent abuse
  MAX_DRAFTS_PER_USER: 5,
  
  // Session ID generation
  SESSION_ID_PREFIX: 'draft_session_',
  SESSION_ID_LENGTH: 32,
} as const;

export type DraftQuoteConfig = typeof DRAFT_QUOTE_CONFIG;

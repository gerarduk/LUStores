// Session management utilities for draft quotes
export const SESSION_STORAGE_KEY = 'draftQuoteSession';
/**
 * Generate a unique session ID for draft quote management
 */
export const generateSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `draft_session_${timestamp}_${random}`;
};
/**
 * Get or create a session ID for the current browser tab
 */
export const getSessionId = () => {
    // Use sessionStorage so it's unique per tab/window
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
        sessionId = generateSessionId();
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        console.log('📝 Generated new draft quote session:', sessionId);
    }
    return sessionId;
};
/**
 * Clear the current session (useful when manually clearing drafts)
 */
export const clearSession = () => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('🗑️ Cleared draft quote session');
};
/**
 * Check if we have an active session
 */
export const hasActiveSession = () => {
    return !!sessionStorage.getItem(SESSION_STORAGE_KEY);
};
export default {
    generateSessionId,
    getSessionId,
    clearSession,
    hasActiveSession,
};

export const BACKUP_SETUP_AT_KEY = "family_pets_backup_setup_at";
export const BACKUP_LAST_EXPORT_AT_KEY = "family_pets_backup_last_export_at";
export const BACKUP_REMINDER_DISMISSED_AT_KEY =
  "family_pets_backup_reminder_dismissed_at";

const FIRST_REMINDER_MS = 7 * 24 * 60 * 60 * 1000;
const REPEAT_REMINDER_MS = 30 * 24 * 60 * 60 * 1000;

export interface BackupPreferences {
  setupAt: number | null;
  lastExportAt: number | null;
  dismissedAt: number | null;
}

function readTimestamp(key: string) {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    // Backup reminders are optional device-only UI metadata.
    return null;
  }
}

function writeTimestamp(key: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage denial must not block family data actions.
  }
}

export function getBackupPreferences(): BackupPreferences {
  return {
    setupAt: readTimestamp(BACKUP_SETUP_AT_KEY),
    lastExportAt: readTimestamp(BACKUP_LAST_EXPORT_AT_KEY),
    dismissedAt: readTimestamp(BACKUP_REMINDER_DISMISSED_AT_KEY),
  };
}

export function ensureBackupSetupTime(now = Date.now()) {
  if (!readTimestamp(BACKUP_SETUP_AT_KEY))
    writeTimestamp(BACKUP_SETUP_AT_KEY, now);
}

export function recordBackupExport(now = Date.now()) {
  writeTimestamp(BACKUP_LAST_EXPORT_AT_KEY, now);
}

export function dismissBackupReminder(now = Date.now()) {
  writeTimestamp(BACKUP_REMINDER_DISMISSED_AT_KEY, now);
}

export function resetBackupPreferences() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BACKUP_SETUP_AT_KEY);
    window.localStorage.removeItem(BACKUP_LAST_EXPORT_AT_KEY);
    window.localStorage.removeItem(BACKUP_REMINDER_DISMISSED_AT_KEY);
  } catch {
    // Device-only reminder metadata must not block a data reset.
  }
}

export function isBackupReminderDue(
  preferences: BackupPreferences,
  now = Date.now(),
) {
  const reference = preferences.lastExportAt ?? preferences.setupAt;
  if (!reference) return false;
  const threshold = preferences.lastExportAt
    ? REPEAT_REMINDER_MS
    : FIRST_REMINDER_MS;
  if (now - reference < threshold) return false;
  return !preferences.dismissedAt || preferences.dismissedAt < reference;
}

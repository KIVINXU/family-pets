export const PET_LAST_ACTIVE_KEY = "family_pets_last_active_at";
export const PET_REST_AFTER_MS = 24 * 60 * 60 * 1000;

export function hasBeenAwayLongEnough(
  lastActiveAt: string | null,
  now = Date.now(),
) {
  if (!lastActiveAt) return false;
  const timestamp = Number(lastActiveAt);
  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    now - timestamp >= PET_REST_AFTER_MS
  );
}

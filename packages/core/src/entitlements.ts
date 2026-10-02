/** Shape returned by the Flarie backend: already resolved Partner → Package → Organization. */
export interface EntitlementSnapshot {
  features: Record<string, boolean>;
  /** null = unlimited */
  limits: Record<string, number | null>;
}

export interface Entitlements {
  /** Unknown features are denied by default. */
  has(feature: string): boolean;
  /** null = no limit configured. */
  limit(name: string): number | null;
}

/**
 * UI-side entitlements are for UX only (hide / disable).
 * The backend enforces the same rules on every request.
 */
export function createEntitlements(snapshot: EntitlementSnapshot): Entitlements {
  return {
    has: (feature) => snapshot.features[feature] === true,
    limit: (name) => snapshot.limits[name] ?? null,
  };
}

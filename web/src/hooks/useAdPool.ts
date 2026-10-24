import { useMemo } from "react";
import { adsApi } from "@/api/services";
import { useAuth } from "@/context/AuthContext";
import { useAsync } from "./useAsync";
import type { Ad, AdPlacement } from "@/types";

export type PlacementCounts = Partial<Record<Exclude<AdPlacement, "any">, number>>;

export interface AdPool {
  loading: boolean;
  error: string | null;
  /** Ad for the i-th slot of a placement, or null when none is available. */
  get: (placement: Exclude<AdPlacement, "any">, index: number) => Ad | null;
  /** Whether impressions/clicks will be recorded (signed-in readers only). */
  tracked: boolean;
}

const ORDER: Exclude<AdPlacement, "any">[] = ["banner", "sidebar", "inline", "feed"];

/**
 * Load every ad a page needs in one parallel batch, per placement, using the
 * backend's delivery rules (status, schedule, campaign, bandit; plus the
 * user's preferences when signed in). Creatives are never repeated across the
 * page's slots while the backend can supply enough distinct ads.
 */
export function useAdPool(counts: PlacementCounts, key: string): AdPool {
  const { user } = useAuth();
  const userId = user && !user.is_admin ? user.id : null;
  const { data, error, loading } = useAsync<Record<string, Ad[]>>(async (signal) => {
    const out: Record<string, Ad[]> = {};
    const seen = new Set<number>();
    const results = await Promise.all(
      ORDER.filter((p) => (counts[p] ?? 0) > 0).map(async (p) => {
        const n = counts[p] ?? 0;
        const ads = userId
          ? await adsApi.personalized(userId, n, p, [], signal)
          : await adsApi.publicAds(n, p, [], signal);
        return [p, ads] as const;
      }),
    );
    // Dedupe across placements in a fixed order so layout is deterministic.
    for (const placement of ORDER) {
      const ads = results.find(([p]) => p === placement)?.[1] ?? [];
      out[placement] = ads.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    }
    return out;
  }, [key, userId]);

  return useMemo<AdPool>(
    () => ({
      loading,
      error,
      tracked: userId !== null,
      get: (placement, index) => data?.[placement]?.[index] ?? null,
    }),
    [data, loading, error, userId],
  );
}

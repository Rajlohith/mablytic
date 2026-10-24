import { articlesApi } from "@/api/services";
import { sortSections } from "@/lib/format";
import type { CategoryCount } from "@/types";
import { useAsync } from "./useAsync";

let cache: Promise<CategoryCount[]> | null = null;

/** Section list for navigation; fetched once and shared. Failed loads aren't cached. */
export function loadSections(): Promise<CategoryCount[]> {
  cache ??= articlesApi.categories().then(sortSections).catch((e: unknown) => {
    cache = null;
    throw e;
  });
  return cache;
}

export function useSections() {
  return useAsync<CategoryCount[]>(() => loadSections(), []);
}

export function resetSectionsCache(): void {
  cache = null;
}

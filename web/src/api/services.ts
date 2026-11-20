import type {
  Ad, AdAnalyticsRow, AdInput, AdPlacement, Article, ArticleCard, ArticleInput, CategoryCount,
  Campaign, CampaignInput, HistoryRow, SectionGroup, LoginResponse, Overview, Page, RegisterInput, Targeting, User,
} from "@/types";
import { request } from "./client";

export const authApi = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: { username, password }, auth: false }),
  register: (input: RegisterInput) =>
    request<{ id: number; username: string }>("/auth/register", { method: "POST", body: input, auth: false }),
  me: (signal?: AbortSignal) => request<User>("/auth/me", { signal }),
  updatePreferences: (preferences: string) =>
    request<User>("/auth/preferences", { method: "PUT", body: { preferences } }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/auth/change-password", { method: "POST", body: { current_password, new_password } }),
};

export const articlesApi = {
  list: (q: { category?: string; q?: string; featured?: boolean; page?: number; page_size?: number }, signal?: AbortSignal) =>
    request<Page<ArticleCard>>("/articles", { query: q, auth: false, signal }),
  sections: (perSection: number, signal?: AbortSignal) =>
    request<SectionGroup[]>("/articles/sections", { query: { per_section: perSection }, auth: false, signal }),
  categories: (signal?: AbortSignal) => request<CategoryCount[]>("/articles/categories", { auth: false, signal }),
  get: (slug: string, signal?: AbortSignal) => request<Article>(`/articles/${encodeURIComponent(slug)}`, { auth: false, signal }),
  related: (slug: string, limit = 4, signal?: AbortSignal) =>
    request<ArticleCard[]>(`/articles/${encodeURIComponent(slug)}/related`, { query: { limit }, auth: false, signal }),
  forYou: (q: { page?: number; page_size?: number }, signal?: AbortSignal) =>
    request<Page<ArticleCard>>("/articles/for-you", { query: q, signal }),
};

export const adsApi = {
  /** Anonymous delivery (homepage, public article pages). */
  publicAds: (count: number, placement: AdPlacement, excludeIds: number[], signal?: AbortSignal) =>
    request<Ad[]>("/public/ads", {
      query: { count, placement, exclude_ids: excludeIds.join(",") },
      auth: false,
      signal,
    }),
  /** Personalized delivery for a signed-in user. */
  personalized: (userId: number, count: number, placement: AdPlacement, excludeIds: number[], signal?: AbortSignal) =>
    request<Ad[]>(`/serve-ads/${userId}`, { query: { count, placement, exclude_ids: excludeIds.join(",") }, signal }),
  logInteraction: (userId: number, adId: number, type: "view" | "click") =>
    request<{ id: number }>("/interactions/", { method: "POST", body: { user_id: userId, ad_id: adId, interaction_type: type } }),
};

export const adminApi = {
  overview: (signal?: AbortSignal) => request<Overview>("/admin/overview", { signal }),
  targeting: (signal?: AbortSignal) => request<Targeting>("/admin/targeting", { signal }),
  analytics: (signal?: AbortSignal) => request<AdAnalyticsRow[]>("/admin/analytics", { signal }),
  history: (limit = 50, signal?: AbortSignal) => request<HistoryRow[]>("/admin/history", { query: { limit }, signal }),

  ads: (signal?: AbortSignal) => request<Ad[]>("/admin/ads", { signal }),
  ad: (id: number, signal?: AbortSignal) => request<Ad>(`/ads/${id}`, { auth: false, signal }),
  createAd: (input: AdInput) => request<Ad>("/admin/ads", { method: "POST", body: input }),
  updateAd: (id: number, input: Partial<AdInput> & { clear_schedule?: boolean }) =>
    request<Ad>(`/admin/ads/${id}`, { method: "PUT", body: input }),
  deleteAd: (id: number) => request<{ message: string }>(`/ads/${id}`, { method: "DELETE" }),
  generateAdCopy: (body: { product: string; category: string; audience?: string; tone?: string; key_points?: string; variant?: "A" | "B" }) =>
    request<Record<string, unknown>>("/admin/ads/generate", { method: "POST", body }),

  campaigns: (signal?: AbortSignal) => request<Campaign[]>("/admin/campaigns", { signal }),
  createCampaign: (input: CampaignInput) => request<Campaign>("/admin/campaigns", { method: "POST", body: input }),
  updateCampaign: (id: number, input: Partial<CampaignInput>) =>
    request<Campaign>(`/admin/campaigns/${id}`, { method: "PUT", body: input }),
  deleteCampaign: (id: number) => request<{ message: string }>(`/admin/campaigns/${id}`, { method: "DELETE" }),

  users: (signal?: AbortSignal) => request<User[]>("/admin/users", { signal }),
  updateUser: (id: number, input: { is_admin?: boolean; is_active?: boolean; preferences?: string }) =>
    request<User>(`/admin/users/${id}`, { method: "PUT", body: input }),
  deleteUser: (id: number) => request<{ message: string }>(`/users/${id}`, { method: "DELETE" }),

  articles: (q: { q?: string; category?: string; status?: string; page?: number; page_size?: number }, signal?: AbortSignal) =>
    request<Page<ArticleCard>>("/admin/articles", { query: q, signal }),
  article: (id: number, signal?: AbortSignal) => request<Article>(`/admin/articles/${id}`, { signal }),
  createArticle: (input: ArticleInput) => request<Article>("/admin/articles", { method: "POST", body: input }),
  updateArticle: (id: number, input: Partial<ArticleInput>) =>
    request<Article>(`/admin/articles/${id}`, { method: "PUT", body: input }),
  deleteArticle: (id: number) => request<{ message: string }>(`/admin/articles/${id}`, { method: "DELETE" }),

  /** Start a live-news refresh in the background (RSS feeds + free APIs). */
  refreshNews: () => request<{ started: boolean; message: string }>("/admin/news/refresh", { method: "POST" }),
};

export type AdStatus = "active" | "paused" | "draft";
export type AdPlacement = "any" | "feed" | "sidebar" | "inline" | "banner";
export type CampaignStatus = "active" | "paused" | "draft" | "ended";
export type ArticleStatus = "published" | "draft";

export interface ArticleCard {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  author: string;
  image_url: string;
  image_alt: string;
  image_credit: string;
  read_minutes: number;
  is_featured: boolean;
  is_demo: boolean;
  status: ArticleStatus;
  published_at: string | null;
}

export interface Article extends ArticleCard {
  body: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface SectionGroup {
  name: string;
  count: number;
  items: ArticleCard[];
}

export interface Ad {
  id: number;
  title: string;
  content: string;
  category: string;
  variant: "A" | "B";
  image_url: string | null;
  advertiser: string | null;
  destination_url: string | null;
  placement: AdPlacement | null;
  status: AdStatus | null;
  start_date: string | null;
  end_date: string | null;
  campaign_id: number | null;
}

export interface AdInput {
  title: string;
  content: string;
  category: string;
  variant: "A" | "B";
  image_url: string;
  advertiser: string;
  destination_url: string;
  placement: AdPlacement;
  status: AdStatus;
  start_date: string | null;
  end_date: string | null;
  campaign_id: number | null;
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  age: number;
  preferences: string;
  is_admin: boolean;
  is_active: boolean | null;
  created_at: string;
}

export interface SessionUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  preferences: string;
}

export interface LoginResponse extends SessionUser {
  access_token: string;
  token_type: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  email: string;
  gender: string;
  age: number;
  preferences: string;
}

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  ad_count: number;
  views: number;
  clicks: number;
  ctr: number;
}

export interface CampaignInput {
  name: string;
  status: CampaignStatus;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface Overview {
  totals: {
    users: number; admins: number; ads: number; active_ads: number;
    campaigns: number; active_campaigns: number; articles: number;
    published_articles: number; views: number; clicks: number; ctr: number;
  };
  daily: { date: string; views: number; clicks: number }[];
  top_ads: { ad_id: number; title: string; views: number; clicks: number; ctr: number }[];
  campaigns: Campaign[];
  system: { database: string; server_time: string };
}

export interface TargetingCategory {
  category: string; news_categories: string[]; ads: number; active_ads: number;
  users: number; views: number; clicks: number; ctr: number;
}

export interface Targeting {
  categories: TargetingCategory[];
  criteria: { supported: string[]; not_supported: string[] };
}

export interface AdAnalyticsRow {
  ad_id: number; title: string; category: string; variant: string;
  views: number; clicks: number; ctr_percentage: number;
}

export interface HistoryRow {
  log_id: number; timestamp: string; user_id: number; username: string;
  user_prefs: string; ad_title: string; variant: string; type: "view" | "click";
}

export interface ArticleInput {
  title: string; summary: string; body: string; category: string; author: string;
  image_url: string; image_alt: string; image_credit: string; read_minutes: number;
  is_featured: boolean; status: ArticleStatus;
}

/** Preference keys the backend understands (ad + user preference categories). */
export const PREFERENCE_OPTIONS = [
  "tech", "gaming", "fitness", "health", "food", "travel", "sports", "books", "education",
] as const;

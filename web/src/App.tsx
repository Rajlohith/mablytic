import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { GuestOnly, RequireAdmin, RequireUser } from "@/components/RouteGuards";
import { LoadingBlock } from "@/components/ui/feedback";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import { NotFoundPage, UnauthorizedPage } from "@/pages/StatusPages";
import { AccountLayout } from "@/pages/account/AccountLayout";

// Reader pages and the whole admin console load on demand.
const SectionPage = lazy(() => import("@/pages/SectionPage"));
const ArticlePage = lazy(() => import("@/pages/ArticlePage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const FeedPage = lazy(() => import("@/pages/account/FeedPage"));
const PreferencesPage = lazy(() => import("@/pages/account/PreferencesPage"));
const SecurityPage = lazy(() => import("@/pages/account/SecurityPage"));
const OverviewPage = lazy(() => import("@/pages/admin/OverviewPage"));
const AdsListPage = lazy(() => import("@/pages/admin/AdsListPage"));
const AdFormPage = lazy(() => import("@/pages/admin/AdFormPage"));
const CampaignsPage = lazy(() => import("@/pages/admin/CampaignsPage"));
const ArticlesPage = lazy(() => import("@/pages/admin/ArticlesPage"));
const ArticleFormPage = lazy(() => import("@/pages/admin/ArticleFormPage"));
const UsersPage = lazy(() => import("@/pages/admin/UsersPage"));
const TargetingPage = lazy(() => import("@/pages/admin/TargetingPage"));
const AnalyticsPage = lazy(() => import("@/pages/admin/AnalyticsPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));

export default function App() {
  return (
    <Suspense fallback={<LoadingBlock className="py-32" />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="section/:slug" element={<SectionPage />} />
          <Route path="article/:slug" element={<ArticlePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route element={<GuestOnly />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>
          <Route element={<RequireUser />}>
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<FeedPage />} />
              <Route path="preferences" element={<PreferencesPage />} />
              <Route path="security" element={<SecurityPage />} />
            </Route>
          </Route>
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="console" element={<AdminLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="ads" element={<AdsListPage />} />
            <Route path="ads/new" element={<AdFormPage />} />
            <Route path="ads/:id/edit" element={<AdFormPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="articles" element={<ArticlesPage />} />
            <Route path="articles/new" element={<ArticleFormPage />} />
            <Route path="articles/:id/edit" element={<ArticleFormPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="targeting" element={<TargetingPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

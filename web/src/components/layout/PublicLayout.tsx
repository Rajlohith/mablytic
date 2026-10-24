import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { resetAdTracking } from "@/components/ads/AdSlot";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function PublicLayout() {
  const { pathname } = useLocation();
  // New page = new impression window; also restore scroll position.
  useEffect(() => {
    resetAdTracking();
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-page flex-1 px-4 pt-6 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

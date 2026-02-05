import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Payment from "./pages/Payment";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 閒置後回到分頁時不自動 refetch，避免連線冷卻導致請求卡住、一直顯示載入
      refetchOnWindowFocus: false,
    },
  },
});

const LOADING_FALLBACK_MS = 8000; // 超過此時長顯示「載入逾時」，避免一直轉圈

/** 未登入或非管理員時導向登入頁 */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setShowFallback(true), LOADING_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen marble-bg flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">正在驗證登入狀態…</p>
        {showFallback && (
          <div className="mt-4 text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">載入逾時，請重新整理或前往登入頁</p>
            <Link
              to="/admin/login"
              className="text-sm font-medium text-primary underline hover:no-underline"
            >
              前往登入
            </Link>
          </div>
        )}
      </div>
    );
  }
  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

/** 全域抑制 Supabase fetch 的 AbortError（React Strict Mode / 元件卸載時會觸發） */
function useSuppressAbortError() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const r = event.reason;
      const isAbort =
        r != null &&
        typeof r === "object" &&
        ((r as { name?: string }).name === "AbortError" ||
          (typeof (r as { message?: string }).message === "string" &&
            /abort|signal is aborted/i.test((r as { message: string }).message)));
      if (isAbort) event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
}

const App = () => {
  useSuppressAbortError();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<Register />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;

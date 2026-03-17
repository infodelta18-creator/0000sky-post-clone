import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import SavedPosts from "./pages/SavedPosts";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Welcome from "./pages/Welcome";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Admin from "./pages/Admin";
import PostDetail from "./pages/PostDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Root route: authenticated → Index feed, unauthenticated → Welcome page */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm font-mono">Loading...</div>;
  if (!user) return <Welcome />;
  return <Index />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm font-mono">Loading...</div>;
  if (!user) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function GuestOrAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm font-mono">Loading...</div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/welcome" element={<GuestOrAuth><Welcome /></GuestOrAuth>} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    {/* মেইন রুট এখন RootRoute লজিক ব্যবহার করবে */}
    <Route path="/" element={<RootRoute />} />
    <Route path="/u/:handle" element={<Profile />} />
    <Route path="/post/:postId" element={<PostDetail />} />
    <Route path="/saved" element={<ProtectedRoute><SavedPosts /></ProtectedRoute>} />
    <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
    <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

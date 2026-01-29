import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  skipTeamCheck?: boolean;
}

export default function AuthGuard({ children, skipTeamCheck = false }: AuthGuardProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      const returnTo = encodeURIComponent(location);
      navigate(`/login?returnTo=${returnTo}`);
    }
  }, [loading, isAuthenticated, navigate, location]);

  useEffect(() => {
    if (!loading && isAuthenticated && user && !skipTeamCheck) {
      const isOnboardingPage = location.startsWith("/onboarding");
      const isAdminPage = location.startsWith("/admin");
      if (!user.supportedTeamId && !isOnboardingPage && !isAdminPage) {
        navigate("/onboarding/team");
      }
    }
  }, [loading, isAuthenticated, user, location, navigate, skipTeamCheck]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

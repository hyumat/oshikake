import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();

  // Issue #107: Check if user has completed team selection
  const { data: profile, isLoading: profileLoading } = trpc.users.getProfile.useQuery(
    undefined,
    { enabled: isAuthenticated && !loading }
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  // Issue #107: Redirect to onboarding if team not selected
  useEffect(() => {
    if (!loading && !profileLoading && isAuthenticated && profile) {
      const isOnOnboardingPage = location.startsWith("/onboarding/");
      if (!profile.myTeamSlug && !isOnOnboardingPage) {
        navigate("/onboarding/team");
      }
    }
  }, [loading, profileLoading, isAuthenticated, profile, location, navigate]);

  if (loading || profileLoading) {
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

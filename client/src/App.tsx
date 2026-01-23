import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect as WouterRedirect } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthGuard from "./components/AuthGuard";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import OnboardingTeam from "./pages/OnboardingTeam";
import Account from "./pages/Account";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Stats from "./pages/Stats";
import Savings from "./pages/Savings";
import Settings from "./pages/Settings";
import AdminSync from "./pages/AdminSync";
import AdminTicketMapping from "./pages/AdminTicketMapping";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import Upgrade from "./pages/Upgrade";
import Pricing from "./pages/Pricing";

// Issue #151: Redirect /stats to /expenses
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <Component />
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      {/* LP & Auth */}
      <Route path={"/"} component={Landing} />
      <Route path={"/login"} component={Login} />
      <Route path={"/signup"} component={Signup} />

      {/* Issue #107: Onboarding flow */}
      <Route path={"/onboarding/team"}>{() => <ProtectedRoute component={OnboardingTeam} />}</Route>

      {/* Protected App Routes */}
      <Route path={"/app"}>{() => <ProtectedRoute component={Home} />}</Route>
      <Route path={"/account"}>{() => <ProtectedRoute component={Account} />}</Route>
      <Route path={"/matches"}>{() => <ProtectedRoute component={Matches} />}</Route>
      <Route path={"/matches/:id"}>{() => <ProtectedRoute component={MatchDetail} />}</Route>
      <Route path={"/expenses"}>{() => <ProtectedRoute component={Stats} />}</Route>
      {/* Issue #151: Redirect /stats to /expenses */}
      <Route path={"/stats"}>{() => <Redirect to="/expenses" />}</Route>
      <Route path={"/savings"}>{() => <ProtectedRoute component={Savings} />}</Route>
      <Route path={"/settings"}>{() => <ProtectedRoute component={Settings} />}</Route>
      <Route path={"/admin/sync"}>{() => <ProtectedRoute component={AdminSync} />}</Route>
      <Route path={"/admin/ticket-mapping"}>{() => <ProtectedRoute component={AdminTicketMapping} />}</Route>

      {/* Legal & Support (Public) */}
      <Route path={"/privacy"} component={Privacy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/support"} component={Support} />
      <Route path={"/upgrade"} component={Upgrade} />
      <Route path={"/pricing"} component={Pricing} />

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// ThemeProvider wraps the whole app.
// defaultTheme can be "light" or "dark".
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable={true}
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

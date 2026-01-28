import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AuthGuard from "./components/AuthGuard";
import { AppShell } from "./components/layout/AppShell";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Matches from "./pages/Matches";
import MatchDetail from "./pages/MatchDetail";
import Stats from "./pages/Stats";
import Savings from "./pages/Savings";
import Expenses from "./pages/Expenses";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Support from "./pages/Support";
import Upgrade from "./pages/Upgrade";
import Pricing from "./pages/Pricing";
import AdminMatches from "./pages/AdminMatches";
import AdminConsole from "./pages/AdminConsole";
import Account from "./pages/Account";
import Settings from "./pages/Settings";
import Share from "./pages/Share";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <AuthGuard>
      <AppShell>
        <Component />
      </AppShell>
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

      {/* Protected App Routes */}
      <Route path={"/app"}>{() => <ProtectedRoute component={Home} />}</Route>
      <Route path={"/matches"}>{() => <ProtectedRoute component={Matches} />}</Route>
      <Route path={"/matches/:id"}>{() => <ProtectedRoute component={MatchDetail} />}</Route>
      <Route path={"/stats"}>{() => <ProtectedRoute component={Stats} />}</Route>
      <Route path={"/savings"}>{() => <ProtectedRoute component={Savings} />}</Route>
      <Route path={"/expenses"}>{() => <ProtectedRoute component={Expenses} />}</Route>
      <Route path={"/account"}>{() => <ProtectedRoute component={Account} />}</Route>
      <Route path={"/settings"}>{() => <ProtectedRoute component={Settings} />}</Route>

      {/* Admin Routes */}
      <Route path={"/admin"}>{() => <ProtectedRoute component={AdminConsole} />}</Route>
      <Route path={"/admin/matches"}>{() => <ProtectedRoute component={AdminMatches} />}</Route>

      {/* Public Share Page */}
      <Route path={"/share/:token"} component={Share} />

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
        // switchable
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

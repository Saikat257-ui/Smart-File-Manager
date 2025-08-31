import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { Footer } from "@/components/footer";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import SignInPage from "@/pages/auth/signin";
import SignUpPage from "@/pages/auth/signup";
import PrivacyPolicy from "@/pages/privacy-policy";

function Router() {
  return (
    <Switch>
      <Route path="/auth/signin" component={SignInPage} />
      <Route path="/auth/signup" component={SignUpPage} />
      <Route path="/privacy-policy">
        {/* Privacy policy should be accessible without authentication */}
        <PrivacyPolicy />
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <Toaster />
              <Router />
            </div>
            <Footer />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

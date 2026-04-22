import { AppLayout } from "@/components/layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ForceChangePassword from "@/pages/force-change-password";

import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import EscalaSemanal from "@/pages/escala-semanal";
import EscalaMensal from "@/pages/escala-mensal";
import Duplas from "@/pages/duplas";
import Membros from "@/pages/membros";
import Relatorios from "@/pages/relatorios";
import Configuracoes from "@/pages/configuracoes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.mustChangePassword) {
    return <ForceChangePassword />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/escala-semanal" component={EscalaSemanal} />
        <Route path="/escala-mensal" component={EscalaMensal} />
        <Route path="/duplas" component={Duplas} />
        <Route path="/membros" component={Membros} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/configuracoes" component={Configuracoes} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

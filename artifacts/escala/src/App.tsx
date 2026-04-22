import { AppLayout } from "@/components/layout";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import EscalaSemanal from "@/pages/escala-semanal";
import EscalaMensal from "@/pages/escala-mensal";
import Duplas from "@/pages/duplas";
import Membros from "@/pages/membros";
import Produtores from "@/pages/produtores";
import Relatorios from "@/pages/relatorios";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
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
        <Route path="/produtores" component={Produtores} />
        <Route path="/relatorios" component={Relatorios} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

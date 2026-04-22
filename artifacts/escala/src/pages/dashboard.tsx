import { useGetDashboardSummary, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  CalendarDays, 
  AlertTriangle, 
  UserCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: summary, isLoading, error } = useGetDashboardSummary(
    { date: today }, 
    { query: { queryKey: getGetDashboardSummaryQueryKey({ date: today }) } }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="col-span-2 h-96 rounded-xl" />
          <Skeleton className="col-span-1 h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Erro ao carregar dashboard</h2>
        <p className="text-muted-foreground mt-2">Tente novamente mais tarde.</p>
      </div>
    );
  }

  const startDate = parseISO(summary.weekStart);
  const endDate = parseISO(summary.weekEnd);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral da Semana</h1>
        <p className="text-muted-foreground mt-1">
          Semana de {format(startDate, "dd 'de' MMMM", { locale: ptBR })} a {format(endDate, "dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl shadow-sm hover-elevate transition-all border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Produtor Responsável</CardTitle>
            <UserCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.currentProducer?.name || "Não atribuído"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Responsável pela semana atual
            </p>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl shadow-sm hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dias Escalados</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.scheduleCount} / 7</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dias com escala definida na semana
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duplas Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.duoSummary.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Duplas com participação esta semana
            </p>
          </CardContent>
        </Card>

        <Card className={`rounded-xl shadow-sm hover-elevate transition-all ${summary.conflictsCount > 0 ? 'border-l-4 border-l-destructive bg-destructive/5' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conflitos</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${summary.conflictsCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.conflictsCount > 0 ? 'text-destructive' : ''}`}>
              {summary.conflictsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.conflictsCount === 0 ? "Nenhum conflito de regra detectado" : "Atenção requerida nas regras"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-2 rounded-xl shadow-sm border-border">
          <CardHeader>
            <CardTitle>Próximos Dias</CardTitle>
            <CardDescription>Visualização rápida da escala dos próximos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.upcomingDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center bg-muted/30 rounded-lg">
                <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma escala programada para os próximos dias.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {summary.upcomingDays.map((day) => {
                  const dayDate = parseISO(day.date);
                  const isToday = day.date === today;
                  return (
                    <div key={day.id} className={`flex items-start p-4 rounded-lg border ${isToday ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'} shadow-sm`}>
                      <div className="flex flex-col items-center justify-center min-w-[80px] border-r pr-4 mr-4">
                        <span className="text-sm text-muted-foreground font-medium uppercase">
                          {format(dayDate, 'EEE', { locale: ptBR })}
                        </span>
                        <span className="text-2xl font-bold">
                          {format(dayDate, 'dd')}
                        </span>
                        {isToday && (
                          <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20 text-[10px]">HOJE</Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Principal</span>
                          {day.mainDuo ? (
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: day.mainDuo.color || '#ccc' }} />
                              <span className="font-medium text-sm">{day.mainDuo.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Não definido</span>
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Lateral</span>
                          {day.sideDuo ? (
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: day.sideDuo.color || '#ccc' }} />
                              <span className="font-medium text-sm">{day.sideDuo.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Não definido</span>
                          )}
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Folga</span>
                          {day.offDuo ? (
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full mr-2 bg-muted-foreground/30" />
                              <span className="font-medium text-sm text-muted-foreground">{day.offDuo.name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Não definido</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 rounded-xl shadow-sm border-border">
          <CardHeader>
            <CardTitle>Resumo das Duplas</CardTitle>
            <CardDescription>Participação na semana atual</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.duoSummary.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Sem dados de duplas para esta semana.</p>
            ) : (
              <div className="space-y-4">
                {summary.duoSummary.map((ds) => (
                  <div key={ds.duo.id} className="flex flex-col space-y-2 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: ds.duo.color || '#ccc' }} />
                        <span className="font-bold text-sm">{ds.duo.name}</span>
                      </div>
                      <span className="text-xs font-mono bg-background px-2 py-1 rounded-md border">
                        {ds.mainDays + ds.sideDays} turnos
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-background rounded border p-1">
                        <div className="font-bold text-primary">{ds.mainDays}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Principal</div>
                      </div>
                      <div className="bg-background rounded border p-1">
                        <div className="font-bold">{ds.sideDays}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Lateral</div>
                      </div>
                      <div className="bg-background rounded border p-1 opacity-60">
                        <div className="font-bold">{ds.offDays}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">Folga</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

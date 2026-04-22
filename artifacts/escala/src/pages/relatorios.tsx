import { useState } from "react";
import {
  useGetDuoStats,
  getGetDuoStatsQueryKey,
  useGetProducerStats,
  getGetProducerStatsQueryKey,
  useGetChangeHistory,
  getGetChangeHistoryQueryKey,
} from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, Users, UserCircle, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MONTHS = [
  { value: "0", label: "Ano inteiro" },
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

function BarSegment({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function Relatorios() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | undefined>(undefined);


  const duoStatsQuery = useGetDuoStats(
    { year, ...(month ? { month } : {}) },
    { query: { queryKey: getGetDuoStatsQueryKey({ year, ...(month ? { month } : {}) }) } }
  );

  const producerStatsQuery = useGetProducerStats(
    { year, ...(month ? { month } : {}) },
    { query: { queryKey: getGetProducerStatsQueryKey({ year, ...(month ? { month } : {}) }) } }
  );

  const historyQuery = useGetChangeHistory(
    { limit: 50, offset: 0 },
    { query: { queryKey: getGetChangeHistoryQueryKey({ limit: 50, offset: 0 }) } }
  );

  const duoStats = duoStatsQuery.data ?? [];
  const producerStats = producerStatsQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const maxMainDays = Math.max(...duoStats.map((d) => d.mainDays), 1);
  const maxTotalDays = Math.max(...duoStats.map((d) => d.totalDays ?? 0), 1);
  const maxWeeks = Math.max(...producerStats.map((p) => p.weeksResponsible), 1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Estatísticas e histórico de alterações da escala.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={month ? String(month) : "0"}
            onValueChange={(v) => setMonth(v === "0" ? undefined : Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="duplas">
        <TabsList className="mb-4">
          <TabsTrigger value="duplas">
            <Users className="h-4 w-4 mr-2" />
            Duplas
          </TabsTrigger>
          <TabsTrigger value="produtores">
            <UserCircle className="h-4 w-4 mr-2" />
            Produtores
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="duplas">
          {duoStatsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : duoStats.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhum dado disponível para o período selecionado.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {duoStats.map((stat) => (
                  <Card
                    key={stat.duo.id}
                    className="rounded-xl border-l-4 shadow-sm"
                    style={{ borderLeftColor: stat.duo.color || "#ccc" }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.duo.color || "#ccc" }} />
                        <CardTitle className="text-base">{stat.duo.name}</CardTitle>
                      </div>
                      <CardDescription>{stat.totalDays ?? 0} dias no total</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-primary font-medium">Principal</span>
                          <span className="font-bold">{stat.mainDays} dias</span>
                        </div>
                        <BarSegment value={stat.mainDays} max={maxMainDays} color={stat.duo.color || "#6366f1"} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Lateral</span>
                          <span>{stat.sideDays} dias</span>
                        </div>
                        <BarSegment value={stat.sideDays} max={maxTotalDays} color="#94a3b8" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground opacity-60">Folga</span>
                          <span className="text-muted-foreground">{stat.offDays} dias</span>
                        </div>
                        <BarSegment value={stat.offDays} max={maxTotalDays} color="#e2e8f0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Comparativo de Dias Principais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...duoStats]
                      .sort((a, b) => b.mainDays - a.mainDays)
                      .map((stat) => (
                        <div key={stat.duo.id} className="flex items-center gap-4">
                          <div className="flex items-center gap-2 w-24 flex-shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.duo.color || "#ccc" }} />
                            <span className="text-sm font-medium truncate">{stat.duo.name}</span>
                          </div>
                          <div className="flex-1">
                            <BarSegment value={stat.mainDays} max={maxMainDays} color={stat.duo.color || "#6366f1"} />
                          </div>
                          <span className="text-sm font-bold w-16 text-right">{stat.mainDays} dias</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="produtores">
          {producerStatsQuery.isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : producerStats.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhum dado disponível para o período selecionado.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {producerStats.map((stat) => (
                <Card key={stat.producer.id} className="rounded-xl shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserCircle className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{stat.producer.name}</h3>
                        <p className="text-muted-foreground text-sm">{stat.producer.notes || "Produtor"}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Semanas responsável</span>
                            <span className="font-bold">{stat.weeksResponsible}</span>
                          </div>
                          <BarSegment value={stat.weeksResponsible} max={maxWeeks} color="#6366f1" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico">
          {historyQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : history.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
                Nenhuma alteração registrada ainda.
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Histórico de Alterações
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {history.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                      <Badge
                        variant="outline"
                        className={`text-[10px] flex-shrink-0 mt-0.5 ${
                          log.action === "create"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : log.action === "delete"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {log.action === "create" ? "Criação" : log.action === "delete" ? "Remoção" : "Atualização"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          Dia {format(parseISO(log.date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {log.createdAt
                            ? format(parseISO(log.createdAt as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

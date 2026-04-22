import { useState } from "react";
import {
  useListSchedules,
  getListSchedulesQueryKey,
  useListDuos,
  getListDuosQueryKey,
  useListProducerWeeks,
  getListProducerWeeksQueryKey,
} from "@workspace/api-client-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  isToday,
  isSameMonth,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type DuoInfo = {
  id: number;
  name: string;
  color?: string | null;
};

export default function EscalaMensal() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: schedules, isLoading } = useListSchedules(
    { year, month },
    { query: { queryKey: getListSchedulesQueryKey({ year, month }) } }
  );

  const { data: duos } = useListDuos({ query: { queryKey: getListDuosQueryKey() } });
  const { data: producerWeeks } = useListProducerWeeks({ query: { queryKey: getListProducerWeeksQueryKey() } });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = (getDay(monthStart) + 6) % 7;
  const allDays = [...Array(startPadding).fill(null), ...days];

  const scheduleMap = new Map<string, typeof schedules[0]>();
  schedules?.forEach((s) => scheduleMap.set(s.date, s));

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  function getMondayOfWeek(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return format(d, "yyyy-MM-dd");
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const totalScheduled = schedules?.length ?? 0;
  const duoCounts = new Map<number, { main: number; side: number; off: number }>();
  schedules?.forEach((s) => {
    if (s.mainDuoId) {
      const c = duoCounts.get(s.mainDuoId) ?? { main: 0, side: 0, off: 0 };
      c.main++;
      duoCounts.set(s.mainDuoId, c);
    }
    if (s.sideDuoId) {
      const c = duoCounts.get(s.sideDuoId) ?? { main: 0, side: 0, off: 0 };
      c.side++;
      duoCounts.set(s.sideDuoId, c);
    }
    if (s.offDuoId) {
      const c = duoCounts.get(s.offDuoId) ?? { main: 0, side: 0, off: 0 };
      c.off++;
      duoCounts.set(s.offDuoId, c);
    }
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Escala Mensal</h1>
          <p className="text-muted-foreground mt-1">Visão completa do mês (somente leitura).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-bold min-w-[150px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {allDays.map((date, idx) => {
              if (!date) return <div key={`pad-${idx}`} className="min-h-[90px]" />;
              const dateStr = format(date, "yyyy-MM-dd");
              const schedule = scheduleMap.get(dateStr);
              const today = isToday(date);
              const mondayKey = getMondayOfWeek(date);
              const producerWeek = producerWeeks?.find((pw) => pw.weekStart === mondayKey);

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col p-1.5 rounded-lg min-h-[90px] border text-xs transition-colors
                    ${today ? "ring-2 ring-primary bg-primary/5" : "bg-card border-border hover:bg-muted/20"}
                    ${!isSameMonth(date, currentDate) ? "opacity-30" : ""}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold w-5 h-5 flex items-center justify-center rounded-full ${today ? "bg-primary text-primary-foreground text-[10px]" : ""}`}>
                      {format(date, "d")}
                    </span>
                    {producerWeek?.producer && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[40px]" title={producerWeek.producer.name}>
                        {producerWeek.producer.name.split(" ")[0]}
                      </span>
                    )}
                  </div>

                  {schedule ? (
                    <div className="space-y-0.5 flex-1">
                      {schedule.mainDuo && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: (schedule.mainDuo as DuoInfo).color || "#ccc" }} />
                          <span className="font-medium truncate text-[10px]">{(schedule.mainDuo as DuoInfo).name}</span>
                        </div>
                      )}
                      {schedule.sideDuo && (
                        <div className="flex items-center gap-1 opacity-70">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: (schedule.sideDuo as DuoInfo).color || "#ccc" }} />
                          <span className="truncate text-[10px]">{(schedule.sideDuo as DuoInfo).name}</span>
                        </div>
                      )}
                      {schedule.offDuo && (
                        <div className="flex items-center gap-1 opacity-40">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                          <span className="truncate text-[10px] line-through">{(schedule.offDuo as DuoInfo).name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">-</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Resumo do Mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dias escalados</span>
                <span className="font-bold">{totalScheduled}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dias sem escala</span>
                <span className="font-bold text-muted-foreground">{days.length - totalScheduled}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribuição das Duplas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {duos?.map((duo) => {
                const counts = duoCounts.get(duo.id) ?? { main: 0, side: 0, off: 0 };
                return (
                  <div key={duo.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: duo.color || "#ccc" }} />
                      <span className="text-sm font-medium">{duo.name}</span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span className="text-primary font-medium">{counts.main} principal</span>
                      <span>{counts.side} lateral</span>
                      <span className="opacity-60">{counts.off} folga</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Produtores no Mês
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {producerWeeks?.filter((pw) => {
                const d = parseISO(pw.weekStart);
                return d.getFullYear() === year && d.getMonth() + 1 === month;
              }).map((pw) => (
                pw.producer && (
                  <div key={pw.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{pw.producer.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {format(parseISO(pw.weekStart), "dd/MM")}
                    </span>
                  </div>
                )
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

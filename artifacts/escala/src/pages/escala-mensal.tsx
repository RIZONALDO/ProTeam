import { useState, useEffect } from "react";
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
  addDays,
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
import {
  ChevronLeft,
  ChevronRight,
  UserCircle,
  ArrowLeftRight,
  Bell,
  CalendarCheck,
  CalendarX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type DuoInfo = {
  id: number;
  name: string;
  color?: string | null;
};

type DayOverride = {
  id: number;
  date: string;
  duoId: number;
  duo: { id: number; name: string } | null;
  replacedMemberId: number;
  replacedMember: { id: number; name: string } | null;
  substituteMemberId: number;
  substituteMember: { id: number; name: string } | null;
  reason: string | null;
};

type ScheduleEntry = {
  date: string;
  mainDuo?: DuoInfo | null;
  sideDuo?: DuoInfo | null;
  offDuo?: DuoInfo | null;
};

function DayMural({
  label,
  date,
  schedule,
  overrides,
  isToday: today,
}: {
  label: string;
  date: Date;
  schedule?: ScheduleEntry | null;
  overrides: DayOverride[];
  isToday: boolean;
}) {
  const hasSubstitutions = overrides.length > 0;
  const hasSchedule = !!(schedule?.mainDuo || schedule?.sideDuo || schedule?.offDuo);

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 transition-colors ${
        today
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-muted/20"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {hasSubstitutions ? (
            <ArrowLeftRight className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          ) : (
            <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={`text-xs font-semibold ${today ? "text-primary" : "text-foreground"}`}>
            {label}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground capitalize">
          {format(date, "EEE, d MMM", { locale: ptBR })}
        </span>
      </div>

      {/* Escala do dia */}
      {hasSchedule ? (
        <div className="space-y-0.5">
          {schedule?.mainDuo && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: schedule.mainDuo.color || "#ccc" }} />
              <span className="text-[10px] font-medium truncate">{schedule.mainDuo.name}</span>
              <span className="text-[9px] text-muted-foreground ml-auto">principal</span>
            </div>
          )}
          {schedule?.sideDuo && (
            <div className="flex items-center gap-1.5 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: schedule.sideDuo.color || "#ccc" }} />
              <span className="text-[10px] truncate">{schedule.sideDuo.name}</span>
              <span className="text-[9px] text-muted-foreground ml-auto">lateral</span>
            </div>
          )}
          {schedule?.offDuo && (
            <div className="flex items-center gap-1.5 opacity-50">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
              <span className="text-[10px] line-through truncate">{schedule.offDuo.name}</span>
              <span className="text-[9px] text-muted-foreground ml-auto">folga</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
          <CalendarX className="h-3 w-3" />
          Sem escala definida
        </div>
      )}

      {/* Substituições */}
      {hasSubstitutions && (
        <div className="border-t border-amber-200 dark:border-amber-800/40 pt-2 space-y-1.5">
          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <ArrowLeftRight className="h-3 w-3" />
            {overrides.length === 1 ? "1 substituição" : `${overrides.length} substituições`}
          </p>
          {overrides.map((o) => (
            <div key={o.id} className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-muted-foreground truncate">{o.replacedMember?.name ?? "?"}</span>
                <ArrowLeftRight className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                <span className="font-medium text-amber-700 dark:text-amber-400 truncate">
                  {o.substituteMember?.name ?? "?"}
                </span>
              </div>
              {o.duo && (
                <p className="text-[9px] text-muted-foreground pl-1">
                  Dupla: {o.duo.name}
                </p>
              )}
              {o.reason && (
                <p className="text-[9px] text-muted-foreground/70 italic pl-1 line-clamp-1">
                  "{o.reason}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EscalaMensal() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [todayOverrides, setTodayOverrides] = useState<DayOverride[]>([]);
  const [tomorrowOverrides, setTomorrowOverrides] = useState<DayOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = tomorrow.getMonth() + 1;

  const { data: schedules, isLoading } = useListSchedules(
    { year, month },
    { query: { queryKey: getListSchedulesQueryKey({ year, month }) } }
  );

  // Fetch schedules for today's month if different from viewed month
  const needsTodayMonthFetch = todayYear !== year || todayMonth !== month;
  const { data: todayMonthSchedules } = useListSchedules(
    { year: todayYear, month: todayMonth },
    {
      query: {
        queryKey: getListSchedulesQueryKey({ year: todayYear, month: todayMonth }),
        enabled: needsTodayMonthFetch,
      },
    }
  );

  // Fetch schedules for tomorrow's month if different from today's
  const needsTomorrowMonthFetch = tomorrowYear !== todayYear || tomorrowMonth !== todayMonth;
  const { data: tomorrowMonthSchedules } = useListSchedules(
    { year: tomorrowYear, month: tomorrowMonth },
    {
      query: {
        queryKey: getListSchedulesQueryKey({ year: tomorrowYear, month: tomorrowMonth }),
        enabled: needsTomorrowMonthFetch,
      },
    }
  );

  const { data: duos } = useListDuos({ query: { queryKey: getListDuosQueryKey() } });
  const { data: producerWeeks } = useListProducerWeeks({ query: { queryKey: getListProducerWeeksQueryKey() } });

  // Fetch day overrides for today and tomorrow's months
  useEffect(() => {
    async function fetchOverrides() {
      setLoadingOverrides(true);
      try {
        const months = new Set([
          `${todayYear}-${todayMonth}`,
          `${tomorrowYear}-${tomorrowMonth}`,
        ]);
        const allOverrides: DayOverride[] = [];
        for (const key of months) {
          const [y, m] = key.split("-").map(Number);
          const res = await fetch(`/api/day-overrides?year=${y}&month=${m}`, { credentials: "include" });
          if (res.ok) {
            const data: DayOverride[] = await res.json();
            allOverrides.push(...data);
          }
        }
        setTodayOverrides(allOverrides.filter((o) => o.date === todayStr));
        setTomorrowOverrides(allOverrides.filter((o) => o.date === tomorrowStr));
      } finally {
        setLoadingOverrides(false);
      }
    }
    fetchOverrides();
  }, [todayStr, tomorrowStr]);

  // Resolve today/tomorrow schedules from available data
  const allAvailableSchedules = [
    ...(schedules ?? []),
    ...(needsTodayMonthFetch ? (todayMonthSchedules ?? []) : []),
    ...(needsTomorrowMonthFetch ? (tomorrowMonthSchedules ?? []) : []),
  ];
  const scheduleMapAll = new Map<string, ScheduleEntry>();
  allAvailableSchedules.forEach((s) => scheduleMapAll.set(s.date, s as ScheduleEntry));

  const todaySchedule = scheduleMapAll.get(todayStr) ?? null;
  const tomorrowSchedule = scheduleMapAll.get(tomorrowStr) ?? null;

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

  const hasMuralContent =
    todayOverrides.length > 0 ||
    tomorrowOverrides.length > 0 ||
    todaySchedule ||
    tomorrowSchedule;

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
              const todayCell = isToday(date);
              const mondayKey = getMondayOfWeek(date);
              const producerWeek = producerWeeks?.find((pw) => pw.weekStart === mondayKey);

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col p-1.5 rounded-lg min-h-[90px] border text-xs transition-colors
                    ${todayCell ? "ring-2 ring-primary bg-primary/5" : "bg-card border-border hover:bg-muted/20"}
                    ${!isSameMonth(date, currentDate) ? "opacity-30" : ""}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold w-5 h-5 flex items-center justify-center rounded-full ${todayCell ? "bg-primary text-primary-foreground text-[10px]" : ""}`}>
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

        {/* Sidebar direita */}
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

          {/* Mural de avisos — hoje e amanhã */}
          <Card className="rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                Mural de Avisos
                {(todayOverrides.length + tomorrowOverrides.length) > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                    {todayOverrides.length + tomorrowOverrides.length} troca{todayOverrides.length + tomorrowOverrides.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {loadingOverrides ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : (
                <>
                  <DayMural
                    label="Hoje"
                    date={today}
                    schedule={todaySchedule}
                    overrides={todayOverrides}
                    isToday={true}
                  />
                  <DayMural
                    label="Amanhã"
                    date={tomorrow}
                    schedule={tomorrowSchedule}
                    overrides={tomorrowOverrides}
                    isToday={false}
                  />
                </>
              )}
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

import { useState, useEffect } from "react";
import {
  useListSchedules,
  getListSchedulesQueryKey,
  useListProducerWeeks,
  getListProducerWeeksQueryKey,
  useCreateProducerWeek,
  useListMembers,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Pencil,
  Check,
  X,
  Bell,
  ArrowLeftRight,
  CalendarCheck,
  CalendarX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type DuoMember = { id: number; name: string; role?: string | null; photoUrl?: string | null };

type DuoInfo = {
  id: number;
  name: string;
  color?: string | null;
  members?: DuoMember[];
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

function photoSrc(objectPath: string | null | undefined) {
  if (!objectPath) return null;
  return `/api/storage${objectPath}`;
}

function MuralDayCard({
  label,
  date,
  schedule,
  overrides,
  accent,
}: {
  label: string;
  date: Date;
  schedule?: ScheduleEntry | null;
  overrides: DayOverride[];
  accent?: boolean;
}) {
  const hasSchedule = !!(schedule?.mainDuo || schedule?.sideDuo || schedule?.offDuo);
  const hasOverrides = overrides.length > 0;

  return (
    <div
      className={`flex-1 min-w-0 rounded-xl border p-3 space-y-2 transition-colors ${
        accent
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-muted/20"
      }`}
    >
      {/* header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {hasOverrides
            ? <ArrowLeftRight className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            : <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          }
          <span className={`text-xs font-semibold ${accent ? "text-primary" : "text-foreground"}`}>
            {label}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground capitalize flex-shrink-0">
          {format(date, "EEE, d MMM", { locale: ptBR })}
        </span>
      </div>

      {/* schedule */}
      {hasSchedule ? (
        <div className="space-y-0.5">
          {schedule?.mainDuo && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: schedule.mainDuo.color || "#ccc" }} />
              <span className="text-[10px] font-medium truncate">{schedule.mainDuo.name}</span>
              <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">principal</span>
            </div>
          )}
          {schedule?.sideDuo && (
            <div className="flex items-center gap-1.5 opacity-80">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: schedule.sideDuo.color || "#ccc" }} />
              <span className="text-[10px] truncate">{schedule.sideDuo.name}</span>
              <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">lateral</span>
            </div>
          )}
          {schedule?.offDuo && (
            <div className="flex items-center gap-1.5 opacity-50">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
              <span className="text-[10px] line-through truncate">{schedule.offDuo.name}</span>
              <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">folga</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
          <CalendarX className="h-3 w-3 flex-shrink-0" />
          Sem escala definida
        </div>
      )}

      {/* substitutions */}
      {hasOverrides && (
        <div className="border-t border-amber-200 dark:border-amber-800/40 pt-2 space-y-1.5">
          <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <ArrowLeftRight className="h-3 w-3" />
            {overrides.length === 1 ? "1 substituição" : `${overrides.length} substituições`}
          </p>
          {overrides.map((o) => (
            <div key={o.id} className="space-y-0.5">
              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                <span className="text-muted-foreground">{o.replacedMember?.name ?? "?"}</span>
                <ArrowLeftRight className="h-2.5 w-2.5 text-amber-500 flex-shrink-0" />
                <span className="font-medium text-amber-700 dark:text-amber-400">{o.substituteMember?.name ?? "?"}</span>
              </div>
              {o.duo && <p className="text-[9px] text-muted-foreground pl-1">Dupla: {o.duo.name}</p>}
              {o.reason && <p className="text-[9px] text-muted-foreground/70 italic pl-1 line-clamp-1">"{o.reason}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EscalaSemanal() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingProducer, setEditingProducer] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [todayOverrides, setTodayOverrides] = useState<DayOverride[]>([]);
  const [tomorrowOverrides, setTomorrowOverrides] = useState<DayOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const todayStr = format(today, "yyyy-MM-dd");
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: schedules, isLoading } = useListSchedules(
    { year, month },
    { query: { queryKey: getListSchedulesQueryKey({ year, month }) } }
  );

  // Always fetch today's month schedules too, if different
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const needsTodayFetch = todayYear !== year || todayMonth !== month;
  const { data: todayMonthSchedules } = useListSchedules(
    { year: todayYear, month: todayMonth },
    { query: { queryKey: getListSchedulesQueryKey({ year: todayYear, month: todayMonth }), enabled: needsTodayFetch } }
  );
  const tomorrowYear = tomorrow.getFullYear();
  const tomorrowMonth = tomorrow.getMonth() + 1;
  const needsTomorrowFetch = tomorrowYear !== todayYear || tomorrowMonth !== todayMonth;
  const { data: tomorrowMonthSchedules } = useListSchedules(
    { year: tomorrowYear, month: tomorrowMonth },
    { query: { queryKey: getListSchedulesQueryKey({ year: tomorrowYear, month: tomorrowMonth }), enabled: needsTomorrowFetch } }
  );

  const { data: producerWeeks } = useListProducerWeeks({ query: { queryKey: getListProducerWeeksQueryKey() } });
  const { data: members } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });
  const createProducerWeek = useCreateProducerWeek();
  const queryClient = useQueryClient();

  // Fetch overrides
  useEffect(() => {
    async function fetchOverrides() {
      setLoadingOverrides(true);
      try {
        const months = new Set([
          `${todayYear}-${todayMonth}`,
          `${tomorrowYear}-${tomorrowMonth}`,
        ]);
        const all: DayOverride[] = [];
        for (const key of months) {
          const [y, m] = key.split("-").map(Number);
          const res = await fetch(`/api/day-overrides?year=${y}&month=${m}`, { credentials: "include" });
          if (res.ok) all.push(...(await res.json() as DayOverride[]));
        }
        setTodayOverrides(all.filter((o) => o.date === todayStr));
        setTomorrowOverrides(all.filter((o) => o.date === tomorrowStr));
      } finally {
        setLoadingOverrides(false);
      }
    }
    fetchOverrides();
  }, [todayStr, tomorrowStr]);

  // Resolve today/tomorrow schedules
  const allSchedules = [
    ...(schedules ?? []),
    ...(needsTodayFetch ? (todayMonthSchedules ?? []) : []),
    ...(needsTomorrowFetch ? (tomorrowMonthSchedules ?? []) : []),
  ];
  const scheduleMapAll = new Map<string, ScheduleEntry>();
  allSchedules.forEach((s) => scheduleMapAll.set(s.date, s as ScheduleEntry));
  const todaySchedule = scheduleMapAll.get(todayStr) ?? null;
  const tomorrowSchedule = scheduleMapAll.get(tomorrowStr) ?? null;

  const producers = members?.filter((m) => m.role === "Produtor") ?? [];

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const currentProducerWeek = producerWeeks?.find((pw) => pw.weekStart === weekStartStr);
  const currentProducer = currentProducerWeek?.member ?? null;

  const scheduleMap = new Map<string, typeof schedules[0]>();
  schedules?.forEach((s) => scheduleMap.set(s.date, s));

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  function startEditProducer() {
    setSelectedMemberId(currentProducer?.id?.toString() ?? "");
    setEditingProducer(true);
  }

  async function saveProducer() {
    const memberId = selectedMemberId ? parseInt(selectedMemberId) : null;
    try {
      await createProducerWeek.mutateAsync({ data: { weekStart: weekStartStr, memberId } });
      queryClient.invalidateQueries({ queryKey: getListProducerWeeksQueryKey() });
      toast.success("Produtor da semana atualizado!");
    } catch {
      toast.error("Erro ao atualizar produtor da semana.");
    }
    setEditingProducer(false);
  }

  function MemberAvatar({ member, size = "sm" }: { member: DuoMember; size?: "sm" | "xs" }) {
    const dim = size === "sm" ? "h-6 w-6 text-[9px]" : "h-5 w-5 text-[8px]";
    const src = photoSrc(member.photoUrl);
    const initials = member.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
    return src ? (
      <img src={src} alt={member.name} className={`${dim} rounded-full object-cover border border-border flex-shrink-0`} title={member.name} />
    ) : (
      <div className={`${dim} rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground flex-shrink-0 border border-border`} title={member.name}>
        {initials}
      </div>
    );
  }

  function DuoChip({ duo, variant }: { duo?: DuoInfo | null; variant: "main" | "side" | "off" }) {
    if (!duo) return <span className="text-xs text-muted-foreground italic">-</span>;
    const variantStyles = { main: "font-bold", side: "opacity-80", off: "opacity-50 line-through" };
    return (
      <div className={`space-y-1 ${variantStyles[variant]}`}>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: duo.color || "#ccc" }} />
          <span className="text-sm">{duo.name}</span>
        </div>
        {variant !== "off" && duo.members && duo.members.length > 0 && (
          <div className="flex flex-col gap-1 ml-3.5">
            {duo.members.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5">
                <MemberAvatar member={m} size="sm" />
                <span className="text-[10px] text-muted-foreground leading-none">{m.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const totalOverrides = todayOverrides.length + tomorrowOverrides.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Escala Semanal</h1>
          <p className="text-muted-foreground mt-1">
            Semana de {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} a {format(weekEnd, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Producer of the week banner */}
      <Card className="rounded-xl border-l-4 border-l-primary bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {currentProducer?.photoUrl ? (
                <img src={photoSrc(currentProducer.photoUrl)!} alt={currentProducer.name}
                  className="h-14 w-14 rounded-full object-cover border-2 border-primary/30 flex-shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 border-2 border-primary/30">
                  <User className="h-7 w-7 text-primary" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">Produtor Responsável pela Semana</p>
                {editingProducer ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger className="h-8 w-52 text-sm">
                        <SelectValue placeholder="Selecione o produtor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Nenhum —</SelectItem>
                        {producers.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={saveProducer} disabled={createProducerWeek.isPending}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingProducer(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="font-bold text-xl mt-0.5">
                    {currentProducer ? currentProducer.name : <span className="text-muted-foreground font-normal italic text-base">Não atribuído</span>}
                  </p>
                )}
              </div>
            </div>
            {!editingProducer && (
              <Button variant="outline" size="sm" onClick={startEditProducer} className="flex-shrink-0">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Alterar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly day cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const schedule = scheduleMap.get(dateStr);
          const todayFlag = isToday(day);

          return (
            <Card key={dateStr} className={`rounded-xl ${todayFlag ? "ring-2 ring-primary shadow-md" : "shadow-sm"}`}>
              <div className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  {todayFlag && (
                    <Badge className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground">Hoje</Badge>
                  )}
                </div>
                <span className={`text-2xl font-bold ${todayFlag ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </span>
              </div>
              <CardContent className="px-4 pb-4 space-y-3">
                {schedule ? (
                  <>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Principal</p>
                      <DuoChip duo={schedule.mainDuo as DuoInfo} variant="main" />
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Lateral</p>
                      <DuoChip duo={schedule.sideDuo as DuoInfo} variant="side" />
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Folga</p>
                      <DuoChip duo={schedule.offDuo as DuoInfo} variant="off" />
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-muted-foreground italic">Sem escala</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Mural de Avisos (rodapé) ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
          <Bell className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Mural de Avisos</span>
          <span className="text-xs text-muted-foreground">— hoje e amanhã</span>
          {totalOverrides > 0 && (
            <Badge className="ml-auto text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 shadow-none">
              {totalOverrides} troca{totalOverrides !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <div className="p-4">
          {loadingOverrides ? (
            <div className="flex gap-4">
              <Skeleton className="h-24 flex-1 rounded-xl" />
              <Skeleton className="h-24 flex-1 rounded-xl" />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <MuralDayCard
                label="Hoje"
                date={today}
                schedule={todaySchedule}
                overrides={todayOverrides}
                accent
              />
              <MuralDayCard
                label="Amanhã"
                date={tomorrow}
                schedule={tomorrowSchedule}
                overrides={tomorrowOverrides}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

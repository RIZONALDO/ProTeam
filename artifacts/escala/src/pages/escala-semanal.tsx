import { useState } from "react";
import {
  useListSchedules,
  getListSchedulesQueryKey,
  useListProducerWeeks,
  getListProducerWeeksQueryKey,
} from "@workspace/api-client-react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type DuoInfo = {
  id: number;
  name: string;
  color?: string | null;
  members?: { id: number; name: string; role?: string | null }[];
};

export default function EscalaSemanal() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: schedules, isLoading } = useListSchedules(
    { year, month },
    { query: { queryKey: getListSchedulesQueryKey({ year, month }) } }
  );

  const { data: producerWeeks } = useListProducerWeeks({ query: { queryKey: getListProducerWeeksQueryKey() } });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const currentProducerWeek = producerWeeks?.find((pw) => pw.weekStart === weekStartStr);

  const scheduleMap = new Map<string, typeof schedules[0]>();
  schedules?.forEach((s) => scheduleMap.set(s.date, s));

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToday = () => setCurrentDate(new Date());

  function DuoChip({ duo, variant }: { duo?: DuoInfo | null; variant: "main" | "side" | "off" }) {
    if (!duo) return <span className="text-xs text-muted-foreground italic">-</span>;

    const variantStyles = {
      main: "font-bold",
      side: "opacity-80",
      off: "opacity-50 line-through",
    };

    return (
      <div className={`flex items-center gap-1.5 ${variantStyles[variant]}`}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: duo.color || "#ccc" }} />
        <span className="text-sm">{duo.name}</span>
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

      {currentProducerWeek?.producer && (
        <Card className="rounded-xl border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtor Responsável pela Semana</p>
              <p className="font-bold text-lg">{currentProducerWeek.producer.name}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const schedule = scheduleMap.get(dateStr);
          const today = isToday(day);

          return (
            <Card
              key={dateStr}
              className={`rounded-xl ${today ? "ring-2 ring-primary shadow-md" : "shadow-sm"}`}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  {today && (
                    <Badge className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground">Hoje</Badge>
                  )}
                </div>
                <span className={`text-2xl font-bold ${today ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </span>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {schedule ? (
                  <>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Principal</p>
                      <DuoChip duo={schedule.mainDuo as DuoInfo} variant="main" />
                      {(schedule.mainDuo as DuoInfo)?.members?.map((m) => (
                        <p key={m.id} className="text-[10px] text-muted-foreground ml-3.5 mt-0.5">{m.name}</p>
                      ))}
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Lateral</p>
                      <DuoChip duo={schedule.sideDuo as DuoInfo} variant="side" />
                      {(schedule.sideDuo as DuoInfo)?.members?.map((m) => (
                        <p key={m.id} className="text-[10px] text-muted-foreground ml-3.5 mt-0.5">{m.name}</p>
                      ))}
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
    </div>
  );
}

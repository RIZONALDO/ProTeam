import { useState, useCallback, useMemo } from "react";
import {
  useListSchedules,
  getListSchedulesQueryKey,
  useListDuos,
  getListDuosQueryKey,
  useBulkUpdateSchedules,
  useListConflicts,
  getListConflictsQueryKey,
  useListProducerWeeks,
  getListProducerWeeksQueryKey,
} from "@workspace/api-client-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parseISO,
  getDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, X, User, MessageSquare, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Duo = {
  id: number;
  name: string;
  color?: string | null;
  members?: { id: number; name: string }[];
};

type DaySchedule = {
  id?: number;
  date: string;
  mainDuoId?: number | null;
  sideDuoId?: number | null;
  offDuoId?: number | null;
  mainDuo?: Duo | null;
  sideDuo?: Duo | null;
  offDuo?: Duo | null;
  notes?: string | null;
};

type SlotId = `${string}:${"main" | "side" | "off"}`;

type LiveConflict = {
  date: string;
  type: string;
  description: string;
  severity: "error" | "warning";
  duoId: number | null;
  duoName: string | null;
};

function detectLiveConflicts(
  schedules: Array<{ date: string; mainDuoId?: number | null; sideDuoId?: number | null; offDuoId?: number | null }>,
  duoMap: Map<number, string>
): LiveConflict[] {
  const result: LiveConflict[] = [];
  const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const assigned = [s.mainDuoId, s.sideDuoId, s.offDuoId].filter((id): id is number => id != null);
    const unique = new Set(assigned);

    if (assigned.length > unique.size) {
      result.push({ date: s.date, type: "duplicate_assignment", description: "Mesma dupla em mais de um papel", severity: "error", duoId: null, duoName: null });
    }
    if (assigned.length > 0 && assigned.length < 3) {
      const missing = [!s.mainDuoId && "principal", !s.sideDuoId && "lateral", !s.offDuoId && "folga"].filter(Boolean).join(" e ");
      result.push({ date: s.date, type: "incomplete_day", description: `Dia incompleto — sem ${missing}`, severity: "warning", duoId: null, duoName: null });
    }
    if (s.sideDuoId && i > 0) {
      const prev = sorted[i - 1];
      const diff = Math.round((new Date(s.date + "T00:00:00Z").getTime() - new Date(prev.date + "T00:00:00Z").getTime()) / 86400000);
      if (diff === 1 && prev.sideDuoId === s.sideDuoId) {
        result.push({ date: s.date, type: "side_no_rest", description: "Dupla lateral sem descanso", severity: "error", duoId: s.sideDuoId, duoName: duoMap.get(s.sideDuoId) ?? null });
      }
    }
    if (s.mainDuoId && i > 0) {
      const prev = sorted[i - 1];
      const diff = Math.round((new Date(s.date + "T00:00:00Z").getTime() - new Date(prev.date + "T00:00:00Z").getTime()) / 86400000);
      if (diff === 1 && prev.mainDuoId === s.mainDuoId) {
        result.push({ date: s.date, type: "main_consecutive", description: "Dupla principal repetida em dias seguidos", severity: "warning", duoId: s.mainDuoId, duoName: duoMap.get(s.mainDuoId) ?? null });
      }
    }
  }

  // workload imbalance
  if (sorted.length >= 5) {
    const work = new Map<number, number>();
    for (const s of sorted) {
      if (s.mainDuoId) work.set(s.mainDuoId, (work.get(s.mainDuoId) ?? 0) + 1);
      if (s.sideDuoId) work.set(s.sideDuoId, (work.get(s.sideDuoId) ?? 0) + 1);
    }
    const entries = Array.from(work.entries());
    if (entries.length >= 2) {
      const maxE = entries.reduce((a, b) => a[1] >= b[1] ? a : b);
      const minE = entries.reduce((a, b) => a[1] <= b[1] ? a : b);
      const diff = maxE[1] - minE[1];
      if (diff >= 3) {
        result.push({
          date: sorted[sorted.length - 1].date,
          type: "imbalance",
          description: `"${duoMap.get(maxE[0]) ?? `Dupla ${maxE[0]}`}" trabalha ${diff} dias a mais que "${duoMap.get(minE[0]) ?? `Dupla ${minE[0]}`}"`,
          severity: "warning",
          duoId: maxE[0],
          duoName: duoMap.get(maxE[0]) ?? null,
        });
      }
    }
  }

  return result;
}

function DraggableDuo({ duo, context }: { duo: Duo; context: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `duo-${duo.id}-${context}`,
    data: { duoId: duo.id, duo },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 px-2 py-1.5 bg-background border rounded-lg cursor-grab active:cursor-grabbing text-xs font-medium shadow-sm hover:shadow-md transition-shadow select-none"
    >
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: duo.color || "#ccc" }} />
      <span className="truncate">{duo.name}</span>
    </div>
  );
}

function DroppableSlot({
  slotId,
  duo,
  label,
  onClear,
}: {
  slotId: string;
  duo?: Duo | null;
  label: string;
  onClear?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div
      ref={setNodeRef}
      className={`relative rounded min-h-[28px] flex items-center transition-colors ${
        isOver ? "bg-primary/10 ring-1 ring-primary" : "bg-muted/30"
      }`}
    >
      {duo ? (
        <div className="flex items-center gap-1 px-2 py-1 w-full">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: duo.color || "#ccc" }} />
          <span className="text-[10px] font-medium truncate flex-1">{duo.name}</span>
          {onClear && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-muted-foreground hover:text-destructive flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground px-2 italic">{label}</span>
      )}
    </div>
  );
}

function CalendarDay({
  date,
  schedule,
  isCurrentMonth,
  dayAlerts,
  onDropDuo,
  onClearSlot,
  onDayClick,
}: {
  date: Date;
  schedule?: DaySchedule;
  isCurrentMonth: boolean;
  dayAlerts: Map<string, "error" | "warning">;
  onDropDuo: (date: string, role: "main" | "side" | "off", duoId: number) => void;
  onClearSlot: (date: string, role: "main" | "side" | "off") => void;
  onDayClick: (date: string) => void;
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const today = isToday(date);
  const alertSeverity = dayAlerts.get(dateStr);
  const hasNote = !!(schedule?.notes?.trim());

  return (
    <div
      className={`group relative flex flex-col p-1.5 border rounded-lg min-h-[110px] transition-colors
        ${!isCurrentMonth ? "opacity-30 bg-muted/20 pointer-events-none" : "bg-card hover:bg-muted/10 cursor-pointer"}
        ${today ? "ring-2 ring-primary" : ""}
        ${alertSeverity === "error" ? "border-destructive/60" : alertSeverity === "warning" ? "border-amber-400/60" : "border-border"}
      `}
      onClick={() => isCurrentMonth && onDayClick(dateStr)}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
            ${today ? "bg-primary text-primary-foreground" : "text-foreground"}`}
        >
          {format(date, "d")}
        </span>
        <div className="flex items-center gap-0.5">
          {hasNote && (
            <Tooltip>
              <TooltipTrigger asChild>
                <StickyNote className="h-3 w-3 text-primary/60" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[180px] text-xs">{schedule!.notes}</TooltipContent>
            </Tooltip>
          )}
          {alertSeverity === "error" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="h-3 w-3 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>Erro de regra neste dia</TooltipContent>
            </Tooltip>
          )}
          {alertSeverity === "warning" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>Aviso neste dia</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {isCurrentMonth && (
        <div className="flex flex-col gap-0.5 flex-1" onClick={(e) => e.stopPropagation()}>
          <DroppableSlot
            slotId={`${dateStr}:main`}
            duo={schedule?.mainDuo}
            label="Principal"
            onClear={() => onClearSlot(dateStr, "main")}
          />
          <DroppableSlot
            slotId={`${dateStr}:side`}
            duo={schedule?.sideDuo}
            label="Lateral"
            onClear={() => onClearSlot(dateStr, "side")}
          />
          <DroppableSlot
            slotId={`${dateStr}:off`}
            duo={schedule?.offDuo}
            label="Folga"
            onClear={() => onClearSlot(dateStr, "off")}
          />
        </div>
      )}

      {/* Note preview strip */}
      {hasNote && (
        <div className="mt-1 px-1 py-0.5 rounded bg-primary/8 border border-primary/15 text-[10px] text-primary/70 leading-tight line-clamp-1">
          {schedule!.notes}
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type DayNotesDialogProps = {
  selectedDay: string | null;
  schedule: DaySchedule | null | undefined;
  noteText: string;
  onNoteChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
};

function DayNotesDialog({ selectedDay, schedule, noteText, onNoteChange, onSave, onClose }: DayNotesDialogProps) {
  if (!selectedDay) return null;
  const parsedDate = parseISO(selectedDay);
  const dayLabel = format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  const savedNote = schedule?.notes ?? "";
  const isDirty = noteText.trim() !== savedNote;
  const slots = [
    { label: "Principal", duo: schedule?.mainDuo },
    { label: "Lateral",   duo: schedule?.sideDuo  },
    { label: "Folga",     duo: schedule?.offDuo   },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 capitalize text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            {dayLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm">
          {slots.map(({ label, duo }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 text-xs">{label}</span>
              {duo ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: duo.color || "#ccc" }} />
                  <span className="font-medium text-xs">{duo.name}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">—</span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
            Observação
          </label>
          <Textarea
            value={noteText}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="Descreva ausências, situações adversas, trocas ou qualquer observação relevante para este dia..."
            className="resize-none text-sm rounded-xl"
            rows={4}
            autoFocus
          />
          {noteText.trim() && (
            <p className="text-[11px] text-muted-foreground">
              A observação será salva ao clicar em &quot;Salvar alterações&quot; no calendário.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          {isDirty ? (
            <Button size="sm" onClick={onSave}>Confirmar</Button>
          ) : (
            <Button size="sm" onClick={onClose}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeDuo, setActiveDuo] = useState<Duo | null>(null);
  const [localSchedules, setLocalSchedules] = useState<Record<string, DaySchedule>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: schedules, isLoading: isLoadingSchedules } = useListSchedules(
    { year, month },
    { query: { queryKey: getListSchedulesQueryKey({ year, month }) } }
  );

  const { data: duos, isLoading: isLoadingDuos } = useListDuos(
    { query: { queryKey: getListDuosQueryKey() } }
  );

  const { data: conflicts } = useListConflicts(
    { year, month },
    { query: { queryKey: getListConflictsQueryKey({ year, month }) } }
  );

  const { data: producerWeeks } = useListProducerWeeks({ query: { queryKey: getListProducerWeeksQueryKey() } });

  const updateSchedules = useBulkUpdateSchedules();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setLocalSchedules({});
  };
  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setLocalSchedules({});
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start
  const startPad = getDay(monthStart);
  const allDays = [...Array(startPad).fill(null), ...days];

  const scheduleMap = new Map<string, DaySchedule>();
  schedules?.forEach((s) => scheduleMap.set(s.date, s as DaySchedule));

  // Build duoMap for live detection
  const duoMap = useMemo(() => {
    const m = new Map<number, string>();
    duos?.forEach((d) => m.set(d.id, d.name));
    return m;
  }, [duos]);

  // Live conflicts computed from merged schedules (immediate feedback while dragging)
  const liveConflicts = useMemo(() => {
    const allDays = days.map((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const s = getMergedSchedule(dateStr);
      return { date: dateStr, mainDuoId: s?.mainDuoId ?? null, sideDuoId: s?.sideDuoId ?? null, offDuoId: s?.offDuoId ?? null };
    }).filter((s) => s.mainDuoId || s.sideDuoId || s.offDuoId);
    return detectLiveConflicts(allDays, duoMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSchedules, schedules, duoMap]);

  // Map date -> highest severity for CalendarDay indicators
  const dayAlerts = useMemo(() => {
    const m = new Map<string, "error" | "warning">();
    for (const c of liveConflicts) {
      const prev = m.get(c.date);
      if (!prev || c.severity === "error") m.set(c.date, c.severity);
    }
    return m;
  }, [liveConflicts]);

  function getMergedSchedule(dateStr: string): DaySchedule | undefined {
    const api = scheduleMap.get(dateStr);
    const local = localSchedules[dateStr];
    if (!local && !api) return undefined;
    if (!local) return api;

    const duoById = (id?: number | null) => duos?.find((d) => d.id === id) ?? null;
    return {
      date: dateStr,
      mainDuoId: local.mainDuoId ?? api?.mainDuoId,
      sideDuoId: local.sideDuoId ?? api?.sideDuoId,
      offDuoId: local.offDuoId ?? api?.offDuoId,
      mainDuo: duoById(local.mainDuoId !== undefined ? local.mainDuoId : api?.mainDuoId),
      sideDuo: duoById(local.sideDuoId !== undefined ? local.sideDuoId : api?.sideDuoId),
      offDuo: duoById(local.offDuoId !== undefined ? local.offDuoId : api?.offDuoId),
    };
  }

  function handleDropDuo(date: string, role: "main" | "side" | "off", duoId: number) {
    const duo = duos?.find((d) => d.id === duoId);
    if (!duo) return;

    setLocalSchedules((prev) => {
      const existing = prev[date] ?? {};
      return {
        ...prev,
        [date]: {
          ...existing,
          date,
          [`${role}DuoId`]: duoId,
          [`${role}Duo`]: duo,
        },
      };
    });
  }

  function handleClearSlot(date: string, role: "main" | "side" | "off") {
    setLocalSchedules((prev) => {
      const existing = prev[date] ?? {};
      return {
        ...prev,
        [date]: {
          ...existing,
          date,
          [`${role}DuoId`]: null,
          [`${role}Duo`]: null,
        },
      };
    });
  }

  function handleDayClick(dateStr: string) {
    const schedule = getMergedSchedule(dateStr);
    setSelectedDay(dateStr);
    setNoteText(schedule?.notes ?? "");
  }

  function handleNoteSave() {
    if (!selectedDay) return;
    setLocalSchedules((prev) => ({
      ...prev,
      [selectedDay]: {
        ...(prev[selectedDay] ?? { date: selectedDay }),
        date: selectedDay,
        notes: noteText.trim() || null,
      },
    }));
    setSelectedDay(null);
  }

  function handleDragStart(event: DragStartEvent) {
    const duo = event.active.data.current?.duo as Duo;
    setActiveDuo(duo ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDuo(null);
    const { active, over } = event;
    if (!over) return;

    const [date, role] = (over.id as string).split(":") as [string, "main" | "side" | "off"];
    if (!date || !role) return;

    const duoId = active.data.current?.duoId as number;
    if (!duoId) return;

    handleDropDuo(date, role, duoId);
  }

  const hasPendingChanges = Object.keys(localSchedules).length > 0;

  async function handleSave() {
    const allSchedules = new Map<string, DaySchedule>();
    schedules?.forEach((s) => allSchedules.set(s.date, s as DaySchedule));
    Object.entries(localSchedules).forEach(([date, ls]) => {
      const existing = allSchedules.get(date) ?? {};
      allSchedules.set(date, { ...existing, ...ls });
    });

    const payload = Array.from(allSchedules.values()).map((s) => ({
      date: s.date,
      mainDuoId: s.mainDuoId ?? null,
      sideDuoId: s.sideDuoId ?? null,
      offDuoId: s.offDuoId ?? null,
      notes: s.notes ?? null,
    }));

    try {
      await updateSchedules.mutateAsync({ data: { schedules: payload } });
      setLocalSchedules({});
      queryClient.invalidateQueries({ queryKey: getListSchedulesQueryKey({ year, month }) });
      queryClient.invalidateQueries({ queryKey: getListConflictsQueryKey({ year, month }) });
      toast.success("Escala salva com sucesso!");
    } catch {
      toast.error("Erro ao salvar escala.");
    }
  }

  function handleDiscard() {
    setLocalSchedules({});
  }

  if (isLoadingSchedules || isLoadingDuos) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário Mensal</h1>
            <p className="text-muted-foreground mt-1">Arraste as duplas para definir a escala diária.</p>
          </div>
          <div className="flex items-center gap-3">
            {hasPendingChanges && (
              <>
                <Button variant="outline" size="sm" onClick={handleDiscard}>
                  Descartar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateSchedules.isPending}>
                  {updateSchedules.isPending ? "Salvando..." : "Salvar alterações"}
                </Button>
              </>
            )}
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
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {Array.from({ length: Math.ceil(allDays.length / 7) }, (_, weekIdx) => {
                const weekDays = allDays.slice(weekIdx * 7, weekIdx * 7 + 7);
                // Calendar rows start on Sunday; Seg (Monday) is index 1
                const monday = weekDays[1] ?? weekDays.find((d) => d !== null) ?? null;
                const weekMon = monday ? startOfWeek(monday, { weekStartsOn: 1 }) : null;
                const weekMonStr = weekMon ? format(weekMon, "yyyy-MM-dd") : null;
                const pw = weekMonStr ? producerWeeks?.find((p) => p.weekStart === weekMonStr) : null;
                const producer = pw?.member ?? null;

                return (
                  <div key={weekIdx}>
                    {producer && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 mb-0.5 bg-primary/5 rounded-md border border-primary/10">
                        {producer.photoUrl ? (
                          <img
                            src={`/api/storage${producer.photoUrl}`}
                            alt={producer.name}
                            className="h-4 w-4 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="h-2.5 w-2.5 text-primary" />
                          </div>
                        )}
                        <span className="text-[11px] font-semibold text-primary truncate">
                          Produtor: {producer.name}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((date, idx) => {
                        if (!date) return <div key={`pad-${weekIdx}-${idx}`} className="min-h-[110px]" />;
                        const dateStr = format(date, "yyyy-MM-dd");
                        const schedule = getMergedSchedule(dateStr);
                        return (
                          <CalendarDay
                            key={dateStr}
                            date={date}
                            schedule={schedule}
                            isCurrentMonth={isSameMonth(date, currentDate)}
                            dayAlerts={dayAlerts}
                            onDropDuo={handleDropDuo}
                            onClearSlot={handleClearSlot}
                            onDayClick={handleDayClick}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-48 flex-shrink-0">
            <Card className="sticky top-0 rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Duplas</CardTitle>
                <p className="text-xs text-muted-foreground">Arraste para um dia</p>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {duos?.map((duo) => (
                  <DraggableDuo key={duo.id} duo={duo as Duo} context="sidebar" />
                ))}
              </CardContent>
            </Card>

            {liveConflicts.length > 0 && (() => {
              const errors = liveConflicts.filter((c) => c.severity === "error");
              const warnings = liveConflicts.filter((c) => c.severity === "warning");
              return (
                <div className="mt-3 space-y-2">
                  {errors.length > 0 && (
                    <Card className="border-destructive/50 bg-destructive/5 rounded-xl">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="text-xs text-destructive flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Erros ({errors.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 pt-0 px-3 pb-3">
                        {errors.map((c, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-semibold text-destructive">{c.date.slice(8)}:</span>{" "}
                            <span className="text-destructive/80">{c.description}</span>
                            {c.duoName && <span className="ml-1 font-medium text-destructive">({c.duoName})</span>}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {warnings.length > 0 && (
                    <Card className="border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl">
                      <CardHeader className="pb-2 pt-3 px-3">
                        <CardTitle className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Avisos ({warnings.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1.5 pt-0 px-3 pb-3">
                        {warnings.map((c, i) => (
                          <div key={i} className="text-xs">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{c.type === "imbalance" ? "Mês" : c.date.slice(8)}:</span>{" "}
                            <span className="text-amber-700 dark:text-amber-300">{c.description}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDuo && (
          <div className="flex items-center gap-2 px-3 py-2 bg-background border-2 border-primary rounded-lg shadow-xl text-sm font-medium">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeDuo.color || "#ccc" }} />
            {activeDuo.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>

    <DayNotesDialog
      selectedDay={selectedDay}
      schedule={selectedDay ? getMergedSchedule(selectedDay) : undefined}
      noteText={noteText}
      onNoteChange={setNoteText}
      onSave={handleNoteSave}
      onClose={() => setSelectedDay(null)}
    />
    </>
  );
}

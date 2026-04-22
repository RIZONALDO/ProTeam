import { useState } from "react";
import {
  useListProducers,
  getListProducersQueryKey,
  useCreateProducer,
  useUpdateProducer,
  useDeleteProducer,
  useListProducerWeeks,
  getListProducerWeeksQueryKey,
  useCreateProducerWeek,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, UserCircle, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type ProducerForm = {
  name: string;
  contact: string;
  notes: string;
};

const defaultForm = (): ProducerForm => ({ name: "", contact: "", notes: "" });

const PRODUCER_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];
function getColor(id: number) { return PRODUCER_COLORS[id % PRODUCER_COLORS.length]; }

export default function Produtores() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProducerForm>(defaultForm());
  const [weekForm, setWeekForm] = useState({ weekStart: "", producerId: "" });
  const [expandedProducer, setExpandedProducer] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { data: producers, isLoading } = useListProducers({ query: { queryKey: getListProducersQueryKey() } });
  const { data: producerWeeks } = useListProducerWeeks({ query: { queryKey: getListProducerWeeksQueryKey() } });
  const createProducer = useCreateProducer();
  const updateProducer = useUpdateProducer();
  const deleteProducer = useDeleteProducer();
  const createProducerWeek = useCreateProducerWeek();

  function openCreate() {
    setEditId(null);
    setForm(defaultForm());
    setDialogOpen(true);
  }

  function openEdit(p: NonNullable<typeof producers>[0]) {
    setEditId(p.id);
    setForm({ name: p.name, contact: p.contact || "", notes: p.notes || "" });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Nome é obrigatório."); return; }
    try {
      if (editId) {
        await updateProducer.mutateAsync({ id: editId, data: { name: form.name, contact: form.contact || null, notes: form.notes || null } });
        toast.success("Produtor atualizado!");
      } else {
        await createProducer.mutateAsync({ data: { name: form.name, contact: form.contact || null, notes: form.notes || null } });
        toast.success("Produtor criado!");
      }
      queryClient.invalidateQueries({ queryKey: getListProducersQueryKey() });
      setDialogOpen(false);
    } catch { toast.error("Erro ao salvar produtor."); }
  }

  async function handleDelete(id: number) {
    try {
      await deleteProducer.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListProducersQueryKey() });
      toast.success("Produtor removido.");
    } catch { toast.error("Erro ao remover produtor."); }
    setDeleteId(null);
  }

  async function handleAssignWeek() {
    if (!weekForm.weekStart || !weekForm.producerId) { toast.error("Preencha todos os campos."); return; }
    try {
      await createProducerWeek.mutateAsync({ data: { weekStart: weekForm.weekStart, producerId: Number(weekForm.producerId) } });
      queryClient.invalidateQueries({ queryKey: getListProducerWeeksQueryKey() });
      setWeekDialogOpen(false);
      setWeekForm({ weekStart: "", producerId: "" });
      toast.success("Semana atribuída!");
    } catch { toast.error("Erro ao atribuir semana."); }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const producerWeeksMap = new Map<number, typeof producerWeeks>();
  producerWeeks?.forEach((pw) => {
    const pid = pw.producerId;
    if (!pid) return;
    if (!producerWeeksMap.has(pid)) producerWeeksMap.set(pid, []);
    producerWeeksMap.get(pid)!.push(pw);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtores</h1>
          <p className="text-muted-foreground mt-1">Gerencie os produtores e suas semanas de responsabilidade.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWeekDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Atribuir Semana
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produtor
          </Button>
        </div>
      </div>

      {producers?.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum produtor cadastrado ainda.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar primeiro produtor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {producers?.map((producer) => {
            const weeks = producerWeeksMap.get(producer.id) ?? [];
            const sortedWeeks = [...weeks].sort((a, b) => b.weekStart.localeCompare(a.weekStart));

            return (
              <Card
                key={producer.id}
                className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4"
                style={{ borderLeftColor: getColor(producer.id) }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: getColor(producer.id) }}
                      >
                        {producer.name[0]}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{producer.name}</CardTitle>
                        {producer.notes && (
                          <p className="text-xs text-muted-foreground">{producer.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(producer)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(producer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {producer.contact && (
                    <p className="text-sm text-muted-foreground mb-3">{producer.contact}</p>
                  )}
                  <button
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setExpandedProducer(expandedProducer === producer.id ? null : producer.id)}
                  >
                    {expandedProducer === producer.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <Calendar className="h-4 w-4" />
                    <span>{weeks.length} semana{weeks.length !== 1 ? "s" : ""} atribuída{weeks.length !== 1 ? "s" : ""}</span>
                  </button>

                  {expandedProducer === producer.id && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {sortedWeeks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhuma semana atribuída.</p>
                      ) : (
                        sortedWeeks.slice(0, 8).map((pw) => (
                          <div key={pw.id} className="flex items-center gap-2 px-2 py-1 bg-muted/40 rounded-md text-xs">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>
                              Semana de{" "}
                              <strong>{format(parseISO(pw.weekStart), "dd/MM/yyyy", { locale: ptBR })}</strong>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Produtor" : "Novo Produtor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do produtor" />
            </div>
            <div>
              <Label htmlFor="contact">Contato</Label>
              <Input id="contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="E-mail ou telefone" />
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações opcionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createProducer.isPending || updateProducer.isPending}>
              {editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={weekDialogOpen} onOpenChange={setWeekDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Atribuir Semana a Produtor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weekStart">Início da Semana (segunda-feira)</Label>
              <Input
                id="weekStart"
                type="date"
                value={weekForm.weekStart}
                onChange={(e) => setWeekForm({ ...weekForm, weekStart: e.target.value })}
              />
            </div>
            <div>
              <Label>Produtor</Label>
              <Select value={weekForm.producerId} onValueChange={(v) => setWeekForm({ ...weekForm, producerId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produtor" />
                </SelectTrigger>
                <SelectContent>
                  {producers?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWeekDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssignWeek} disabled={createProducerWeek.isPending}>Atribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produtor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produtor será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteId && handleDelete(deleteId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

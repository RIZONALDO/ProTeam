import { useState } from "react";
import {
  useListDuos,
  getListDuosQueryKey,
  useCreateDuo,
  useUpdateDuo,
  useDeleteDuo,
  useListMembers,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";
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
import { toast } from "sonner";

const PRESET_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316",
];

type DuoForm = {
  name: string;
  color: string;
  memberIds: number[];
  notes: string;
};

const defaultForm = (): DuoForm => ({
  name: "",
  color: "#6366f1",
  memberIds: [],
  notes: "",
});

export default function Duplas() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<DuoForm>(defaultForm());
  const [expandedDuo, setExpandedDuo] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: duos, isLoading } = useListDuos({ query: { queryKey: getListDuosQueryKey() } });
  const { data: members } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });
  const createDuo = useCreateDuo();
  const updateDuo = useUpdateDuo();
  const deleteDuo = useDeleteDuo();

  function openCreate() {
    setEditId(null);
    setForm(defaultForm());
    setDialogOpen(true);
  }

  function openEdit(duo: NonNullable<typeof duos>[0]) {
    setEditId(duo.id);
    setForm({
      name: duo.name,
      color: duo.color || "#6366f1",
      memberIds: duo.members?.map((m) => m.id) ?? [],
      notes: duo.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Nome da dupla é obrigatório.");
      return;
    }
    try {
      if (editId) {
        await updateDuo.mutateAsync({
          id: editId,
          data: { name: form.name, color: form.color, memberIds: form.memberIds, notes: form.notes || null },
        });
        toast.success("Dupla atualizada!");
      } else {
        await createDuo.mutateAsync({
          data: { name: form.name, color: form.color, memberIds: form.memberIds, notes: form.notes || null },
        });
        toast.success("Dupla criada!");
      }
      invalidateAll();
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar dupla.");
    }
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getListDuosQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reports/duo-stats"] });
  }

  async function handleDelete(id: number) {
    try {
      await deleteDuo.mutateAsync({ id });
      invalidateAll();
      toast.success("Dupla removida.");
    } catch {
      toast.error("Erro ao remover dupla.");
    }
    setDeleteId(null);
  }

  function toggleMember(memberId: number) {
    setForm((f) => ({
      ...f,
      memberIds: f.memberIds.includes(memberId)
        ? f.memberIds.filter((id) => id !== memberId)
        : [...f.memberIds, memberId],
    }));
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Duplas</h1>
          <p className="text-muted-foreground mt-1">Gerencie as duplas de trabalho da equipe.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Dupla
        </Button>
      </div>

      {duos?.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma dupla cadastrada ainda.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira dupla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {duos?.map((duo) => (
            <Card
              key={duo.id}
              className="rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4"
              style={{ borderLeftColor: duo.color || "#ccc" }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: duo.color || "#ccc" }} />
                    <CardTitle className="text-lg">{duo.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(duo)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(duo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {duo.notes && (
                  <p className="text-sm text-muted-foreground mb-3">{duo.notes}</p>
                )}
                <button
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setExpandedDuo(expandedDuo === duo.id ? null : duo.id)}
                >
                  {expandedDuo === duo.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Users className="h-4 w-4" />
                  <span>{duo.members?.length ?? 0} membros</span>
                </button>
                {expandedDuo === duo.id && (
                  <div className="mt-2 space-y-1">
                    {duo.members?.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum membro na dupla.</p>
                    ) : (
                      duo.members?.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 rounded-md text-sm">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: duo.color || "#ccc" }}
                          >
                            {m.name[0]}
                          </div>
                          <span>{m.name}</span>
                          {(m as { role?: string }).role && (
                            <Badge variant="outline" className="text-[10px] ml-auto">
                              {(m as { role?: string }).role}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Dupla" : "Nova Dupla"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Dupla A"
              />
            </div>
            <div>
              <Label>Cor</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      form.color === c ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Membros</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {members?.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleMember(m.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-colors ${
                      form.memberIds.includes(m.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: form.memberIds.includes(m.id) ? form.color : "#ccc" }}
                    >
                      {m.name[0]}
                    </div>
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observações opcionais"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createDuo.isPending || updateDuo.isPending}>
              {editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover dupla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A dupla será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

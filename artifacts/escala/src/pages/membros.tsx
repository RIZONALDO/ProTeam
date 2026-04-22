import { useState } from "react";
import {
  useListMembers,
  getListMembersQueryKey,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, User, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

type MemberForm = {
  name: string;
  role: string;
  contact: string;
  notes: string;
};

const defaultForm = (): MemberForm => ({
  name: "",
  role: "",
  contact: "",
  notes: "",
});

const ROLE_COLORS: Record<string, string> = {
  "Apresentadora": "bg-purple-100 text-purple-700 border-purple-200",
  "Apresentador": "bg-purple-100 text-purple-700 border-purple-200",
  "Cinegrafista": "bg-blue-100 text-blue-700 border-blue-200",
  "Editor": "bg-green-100 text-green-700 border-green-200",
  "Produtor": "bg-amber-100 text-amber-700 border-amber-200",
};

function getRoleClass(role?: string | null) {
  if (!role) return "bg-muted text-muted-foreground";
  return ROLE_COLORS[role] || "bg-muted text-muted-foreground";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4",
];

function getAvatarColor(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function Membros() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<MemberForm>(defaultForm());
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const filtered = members?.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.role ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditId(null);
    setForm(defaultForm());
    setDialogOpen(true);
  }

  function openEdit(m: NonNullable<typeof members>[0]) {
    setEditId(m.id);
    setForm({ name: m.name, role: m.role || "", contact: m.contact || "", notes: m.notes || "" });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("Nome do membro é obrigatório.");
      return;
    }
    try {
      if (editId) {
        await updateMember.mutateAsync({
          id: editId,
          data: { name: form.name, role: form.role || null, contact: form.contact || null, notes: form.notes || null },
        });
        toast.success("Membro atualizado!");
      } else {
        await createMember.mutateAsync({
          data: { name: form.name, role: form.role || null, contact: form.contact || null, notes: form.notes || null },
        });
        toast.success("Membro criado!");
      }
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar membro.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteMember.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      toast.success("Membro removido.");
    } catch {
      toast.error("Erro ao remover membro.");
    }
    setDeleteId(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Membros</h1>
          <p className="text-muted-foreground mt-1">Gerencie os membros da equipe de produção.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Membro
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome ou função..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered?.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? "Nenhum membro encontrado." : "Nenhum membro cadastrado ainda."}
            </p>
            {!search && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar primeiro membro
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((member) => (
            <Card key={member.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(member.id) }}
                  >
                    {getInitials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        {member.role && (
                          <Badge variant="outline" className={`text-xs mt-1 ${getRoleClass(member.role)}`}>
                            {member.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(member)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {member.contact && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">{member.contact}</p>
                    )}
                    {member.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate">{member.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Membro" : "Novo Membro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="role">Função</Label>
              <Input
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Ex: Apresentadora, Cinegrafista..."
              />
            </div>
            <div>
              <Label htmlFor="contact">Contato</Label>
              <Input
                id="contact"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="E-mail ou telefone"
              />
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
            <Button onClick={handleSubmit} disabled={createMember.isPending || updateMember.isPending}>
              {editId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O membro será removido permanentemente.
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

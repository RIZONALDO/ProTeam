import { useState, useRef } from "react";
import {
  useListMembers,
  getListMembersQueryKey,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, User, Search, Camera, X, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useUpload } from "@workspace/object-storage-web";
import { CropImageDialog } from "@/components/CropImageDialog";

type MemberForm = {
  name: string;
  role: string;
  contact: string;
  phone: string;
  notes: string;
  photoUrl: string | null;
};

const defaultForm = (): MemberForm => ({
  name: "",
  role: "",
  contact: "",
  phone: "",
  notes: "",
  photoUrl: null,
});

const MEMBER_ROLES = ["Creator", "Produtor"] as const;
type MemberRole = typeof MEMBER_ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  "Creator": "bg-purple-100 text-purple-700 border-purple-200",
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

function photoSrc(objectPath: string | null | undefined) {
  if (!objectPath) return null;
  return `/api/storage${objectPath}`;
}

export default function Membros() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<MemberForm>(defaultForm());
  const [search, setSearch] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListMembers({ query: { queryKey: getListMembersQueryKey() } });
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const { uploadFile, isUploading } = useUpload();

  const filtered = members?.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.role ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditId(null);
    setForm(defaultForm());
    setPhotoPreview(null);
    setDialogOpen(true);
  }

  function openEdit(m: NonNullable<typeof members>[0]) {
    setEditId(m.id);
    setForm({
      name: m.name,
      role: m.role || "",
      contact: m.contact || "",
      phone: m.phone || "",
      notes: m.notes || "",
      photoUrl: m.photoUrl ?? null,
    });
    setPhotoPreview(m.photoUrl ? photoSrc(m.photoUrl) : null);
    setDialogOpen(true);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCropConfirm(croppedBlob: Blob) {
    setCropSrc(null);
    const fileName = pendingFile?.name ?? "photo.jpg";
    const croppedFile = new File([croppedBlob], fileName, { type: "image/jpeg" });
    setPendingFile(null);

    const localPreview = URL.createObjectURL(croppedBlob);
    setPhotoPreview(localPreview);

    const result = await uploadFile(croppedFile);
    if (result) {
      setForm((prev) => ({ ...prev, photoUrl: result.objectPath }));
      toast.success("Foto carregada com sucesso!");
    } else {
      toast.error("Erro ao fazer upload da foto.");
      setPhotoPreview(form.photoUrl ? photoSrc(form.photoUrl) : null);
    }
  }

  function handleCropCancel() {
    setCropSrc(null);
    setPendingFile(null);
  }

  function handleRemovePhoto() {
    setForm((prev) => ({ ...prev, photoUrl: null }));
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          data: {
            name: form.name,
            role: form.role || null,
            contact: form.contact || null,
            phone: form.phone || null,
            notes: form.notes || null,
            photoUrl: form.photoUrl,
          },
        });
        toast.success("Membro atualizado!");
      } else {
        await createMember.mutateAsync({
          data: {
            name: form.name,
            role: form.role || null,
            contact: form.contact || null,
            phone: form.phone || null,
            notes: form.notes || null,
            photoUrl: form.photoUrl,
          },
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
                  {member.photoUrl ? (
                    <img
                      src={photoSrc(member.photoUrl)!}
                      alt={member.name}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(member.id) }}
                    >
                      {getInitials(member.name)}
                    </div>
                  )}
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
                    {(member.contact || member.phone) && (
                      <div className="mt-2 space-y-0.5">
                        {member.contact && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {member.contact}
                          </p>
                        )}
                        {member.phone && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {member.phone}
                          </p>
                        )}
                      </div>
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
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Foto do membro"
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isUploading ? "Enviando..." : "Escolher foto"}
              </Button>
            </div>

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
              <Label htmlFor="role">Tipo</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v })}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {MEMBER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contact">E-mail</Label>
              <Input
                id="contact"
                type="email"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="nome@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
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
            <Button
              onClick={handleSubmit}
              disabled={createMember.isPending || updateMember.isPending || isUploading}
            >
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

      {cropSrc && (
        <CropImageDialog
          open={!!cropSrc}
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

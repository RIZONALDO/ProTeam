import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Users, KeyRound, ShieldCheck, ImagePlus, X } from "lucide-react";

type AppUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  permissions: string;
};

const ALL_MENU_ITEMS = [
  { path: "/", label: "Dashboard" },
  { path: "/calendar", label: "Calendário" },
  { path: "/escala-semanal", label: "Escala Semanal" },
  { path: "/escala-mensal", label: "Escala Mensal" },
  { path: "/duplas", label: "Duplas" },
  { path: "/membros", label: "Membros" },
  { path: "/relatorios", label: "Relatórios" },
];

function apiFetch(path: string, options?: RequestInit) {
  return fetch(path, { ...options, credentials: "include" });
}

function parsePermissions(perms: string): string[] {
  return perms ? perms.split(",").map((p) => p.trim()).filter(Boolean) : [];
}

function serializePermissions(perms: string[]): string {
  return perms.join(",");
}

export default function Configuracoes() {
  const { user: currentUser } = useAuth();

  const [companyName, setCompanyName] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [appLogoPreview, setAppLogoPreview] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "user",
    permissions: [] as string[],
  });
  const [savingUser, setSavingUser] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const name = data["company_name"] ?? "";
        setCompanyName(name);
        setCompanyNameInput(name);
        if (data["app_logo"]) setAppLogo(data["app_logo"]);
      })
      .catch(() => toast.error("Erro ao carregar configurações"))
      .finally(() => setLoadingSettings(false));

    loadUsers();
  }, []);

  function loadUsers() {
    setLoadingUsers(true);
    apiFetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(() => toast.error("Erro ao carregar usuários"))
      .finally(() => setLoadingUsers(false));
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error("Imagem muito grande. Use até 512 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAppLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function saveAppLogo(logoData: string | null) {
    setSavingLogo(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_logo: logoData ?? "" }),
      });
      if (!res.ok) throw new Error();
      setAppLogo(logoData);
      setAppLogoPreview(null);
      const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (link) link.href = logoData ?? "/favicon.svg";
      toast.success(logoData ? "Ícone atualizado!" : "Ícone removido.");
    } catch {
      toast.error("Erro ao salvar ícone");
    } finally {
      setSavingLogo(false);
    }
  }

  async function saveCompanyName() {
    setSavingSettings(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyNameInput }),
      });
      if (!res.ok) throw new Error();
      setCompanyName(companyNameInput);
      toast.success("Nome da empresa atualizado!");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingSettings(false);
    }
  }

  function openNewUser() {
    setEditingUser(null);
    setUserForm({ username: "", displayName: "", password: "", role: "user", permissions: [] });
    setShowUserDialog(true);
  }

  function openEditUser(u: AppUser) {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      displayName: u.displayName,
      password: "",
      role: u.role,
      permissions: parsePermissions(u.permissions),
    });
    setShowUserDialog(true);
  }

  async function saveUser() {
    if (!userForm.displayName.trim() || (!editingUser && !userForm.username.trim())) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (!editingUser && !userForm.password.trim()) {
      toast.error("Informe uma senha para o novo usuário");
      return;
    }
    if (userForm.password) {
      if (userForm.password.length < 8) {
        toast.error("A senha deve ter pelo menos 8 caracteres");
        return;
      }
      if (!/[A-Z]/.test(userForm.password)) {
        toast.error("A senha deve conter pelo menos uma letra maiúscula");
        return;
      }
      if (!/\d/.test(userForm.password)) {
        toast.error("A senha deve conter pelo menos um número");
        return;
      }
    }

    setSavingUser(true);
    try {
      const body: Record<string, string> = {
        displayName: userForm.displayName,
        role: userForm.role,
        permissions: userForm.role === "admin" ? "" : serializePermissions(userForm.permissions),
      };
      if (userForm.password) body["password"] = userForm.password;
      if (!editingUser) {
        body["username"] = userForm.username;
      }

      const res = await apiFetch(
        editingUser ? `/api/users/${editingUser.id}` : "/api/users",
        {
          method: editingUser ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error);
      }
      toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
      setShowUserDialog(false);
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar usuário");
    } finally {
      setSavingUser(false);
    }
  }

  async function deleteUser(id: number) {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro" }));
        throw new Error(err.error);
      }
      toast.success("Usuário removido!");
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover usuário");
    } finally {
      setDeletingId(null);
    }
  }

  function togglePermission(path: string) {
    setUserForm((f) => ({
      ...f,
      permissions: f.permissions.includes(path)
        ? f.permissions.filter((p) => p !== path)
        : [...f.permissions, path],
    }));
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações da plataforma</p>
      </div>

      <Tabs defaultValue="geral">
        <TabsList className="rounded-xl">
          <TabsTrigger value="geral" className="rounded-lg">
            <Building2 className="h-4 w-4 mr-1.5" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-lg">
            <Users className="h-4 w-4 mr-1.5" />
            Usuários
          </TabsTrigger>
        </TabsList>

        {/* ── General tab ── */}
        <TabsContent value="geral" className="mt-4 space-y-4">
          {/* App name */}
          <Card className="rounded-xl max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Nome do Aplicativo</CardTitle>
              <CardDescription>Exibido no topo do menu lateral e na tela de login</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="company-name">Nome</Label>
                    <Input
                      id="company-name"
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      placeholder="Nome do aplicativo..."
                    />
                  </div>
                  <Button
                    onClick={saveCompanyName}
                    disabled={savingSettings || companyNameInput === companyName}
                  >
                    {savingSettings ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* App logo / icon */}
          <Card className="rounded-xl max-w-lg">
            <CardHeader>
              <CardTitle className="text-base">Ícone do Aplicativo</CardTitle>
              <CardDescription>
                Aparece no menu lateral, na tela de login e na aba do navegador. PNG ou SVG, até 512 KB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <Skeleton className="h-20 w-20 rounded-xl" />
              ) : (
                <>
                  {/* Preview row */}
                  <div className="flex items-center gap-4">
                    {/* Current / preview icon */}
                    <div className="relative">
                      {(appLogoPreview ?? appLogo) ? (
                        <img
                          src={appLogoPreview ?? appLogo!}
                          alt="Logo"
                          className="h-16 w-16 object-contain rounded-xl border border-border"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/40">
                          <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      {appLogoPreview && (
                        <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium leading-none">
                          novo
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="logo-upload"
                        className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        <ImagePlus className="h-4 w-4" />
                        {appLogo ? "Trocar ícone" : "Carregar ícone"}
                      </Label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleLogoFile}
                      />
                      {appLogo && !appLogoPreview && (
                        <button
                          onClick={() => saveAppLogo(null)}
                          disabled={savingLogo}
                          className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
                        >
                          <X className="h-3 w-3" />
                          Remover ícone
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Confirm / cancel when a new preview is pending */}
                  {appLogoPreview && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveAppLogo(appLogoPreview)}
                        disabled={savingLogo}
                      >
                        {savingLogo ? "Salvando..." : "Confirmar ícone"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAppLogoPreview(null)}
                        disabled={savingLogo}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users tab ── */}
        <TabsContent value="usuarios" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Usuários do sistema</h2>
              <p className="text-sm text-muted-foreground">Gerencie quem pode acessar a plataforma</p>
            </div>
            <Button onClick={openNewUser} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo usuário
            </Button>
          </div>

          {loadingUsers ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const perms = parsePermissions(u.permissions);
                const isAdmin = u.role === "admin";
                const isMe = u.id === currentUser?.id;
                return (
                  <Card key={u.id} className="rounded-xl">
                    <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {isAdmin ? (
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          ) : (
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{u.displayName}</span>
                            <span className="text-xs text-muted-foreground font-mono">@{u.username}</span>
                            {isMe && <Badge variant="outline" className="text-[10px] px-1.5">você</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant={isAdmin ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {isAdmin ? "Administrador" : "Usuário"}
                            </Badge>
                            {!isAdmin && (
                              <span className="text-[11px] text-muted-foreground">
                                {perms.length === 0
                                  ? "Sem acesso"
                                  : perms.length === ALL_MENU_ITEMS.length
                                  ? "Acesso completo"
                                  : `${perms.length} item${perms.length !== 1 ? "s" : ""}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditUser(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={isMe || deletingId === u.id}
                          onClick={() => deleteUser(u.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingUser && (
              <div className="space-y-1.5">
                <Label>Usuário (login) *</Label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, "") }))}
                  placeholder="usuario.login"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Nome de exibição *</Label>
              <Input
                value={userForm.displayName}
                onChange={(e) => setUserForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{editingUser ? "Nova senha (deixe em branco para manter)" : "Senha *"}</Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
              />
              {(!editingUser || userForm.password) && (
                <div className="space-y-1 pt-1">
                  {[
                    { ok: userForm.password.length >= 8, label: "Mínimo 8 caracteres" },
                    { ok: /[A-Z]/.test(userForm.password), label: "Pelo menos 1 letra maiúscula" },
                    { ok: /\d/.test(userForm.password), label: "Pelo menos 1 número" },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${ok ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                  <SelectItem value="user">Usuário (acesso personalizado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userForm.role === "user" && (
              <div className="space-y-2">
                <Label>Itens de menu permitidos</Label>
                <div className="rounded-xl border p-3 space-y-2">
                  {ALL_MENU_ITEMS.map((item) => (
                    <div key={item.path} className="flex items-center gap-2">
                      <Checkbox
                        id={`perm-${item.path}`}
                        checked={userForm.permissions.includes(item.path)}
                        onCheckedChange={() => togglePermission(item.path)}
                      />
                      <label htmlFor={`perm-${item.path}`} className="text-sm cursor-pointer">
                        {item.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancelar</Button>
            <Button onClick={saveUser} disabled={savingUser}>
              {savingUser ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

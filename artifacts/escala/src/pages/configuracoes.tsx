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
import {
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
  KeyRound,
  ShieldCheck,
  ImagePlus,
  X,
  ShieldHalf,
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";

type AppUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  permissions: string;
};

type AccessProfile = {
  id: string;
  name: string;
  permissions: string[];
};

const ALL_MENU_ITEMS = [
  { path: "/", label: "Dashboard" },
  { path: "/calendar", label: "Calendário" },
  { path: "calendar:substituir_membro", label: "↔ Substituir integrante do dia" },
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

function generateId() {
  return Math.random().toString(36).slice(2, 10);
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

  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [savingProfiles, setSavingProfiles] = useState(false);

  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "user",
    profileId: "",
    permissions: [] as string[],
  });
  const [savingUser, setSavingUser] = useState(false);

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", permissions: [] as string[] });

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const name = data["company_name"] ?? "";
        setCompanyName(name);
        setCompanyNameInput(name);
        if (data["app_logo"]) setAppLogo(data["app_logo"]);
        if (data["access_profiles"]) {
          try {
            setProfiles(JSON.parse(data["access_profiles"]));
          } catch {
            setProfiles([]);
          }
        }
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

  async function saveProfiles(updated: AccessProfile[]) {
    setSavingProfiles(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_profiles: JSON.stringify(updated) }),
      });
      if (!res.ok) throw new Error();
      setProfiles(updated);
      toast.success("Perfis salvos!");
    } catch {
      toast.error("Erro ao salvar perfis");
    } finally {
      setSavingProfiles(false);
    }
  }

  function openNewProfile() {
    setEditingProfile(null);
    setProfileForm({ name: "", permissions: [] });
    setShowProfileDialog(true);
  }

  function openEditProfile(p: AccessProfile) {
    setEditingProfile(p);
    setProfileForm({ name: p.name, permissions: [...p.permissions] });
    setShowProfileDialog(true);
  }

  async function saveProfile() {
    if (!profileForm.name.trim()) {
      toast.error("Informe um nome para o perfil");
      return;
    }
    const updated = editingProfile
      ? profiles.map((p) =>
          p.id === editingProfile.id
            ? { ...p, name: profileForm.name, permissions: profileForm.permissions }
            : p
        )
      : [...profiles, { id: generateId(), name: profileForm.name, permissions: profileForm.permissions }];
    await saveProfiles(updated);
    setShowProfileDialog(false);
  }

  async function deleteProfile(id: string) {
    await saveProfiles(profiles.filter((p) => p.id !== id));
  }

  function toggleProfilePerm(path: string) {
    setProfileForm((f) => ({
      ...f,
      permissions: f.permissions.includes(path)
        ? f.permissions.filter((p) => p !== path)
        : [...f.permissions, path],
    }));
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
    setUserForm({ username: "", displayName: "", password: "", role: "user", profileId: "", permissions: [] });
    setShowUserDialog(true);
  }

  function openEditUser(u: AppUser) {
    setEditingUser(u);
    const perms = parsePermissions(u.permissions);
    const matchedProfile = profiles.find(
      (p) =>
        p.permissions.length === perms.length &&
        p.permissions.every((x) => perms.includes(x))
    );
    setUserForm({
      username: u.username,
      displayName: u.displayName,
      password: "",
      role: u.role,
      profileId: matchedProfile ? matchedProfile.id : perms.length > 0 ? "custom" : "",
      permissions: perms,
    });
    setShowUserDialog(true);
  }

  function handleProfileSelect(profileId: string) {
    if (profileId === "custom" || profileId === "") {
      setUserForm((f) => ({ ...f, profileId, permissions: profileId === "" ? [] : f.permissions }));
    } else {
      const profile = profiles.find((p) => p.id === profileId);
      setUserForm((f) => ({
        ...f,
        profileId,
        permissions: profile ? profile.permissions : [],
      }));
    }
  }

  function toggleUserPermission(path: string) {
    setUserForm((f) => ({
      ...f,
      profileId: "custom",
      permissions: f.permissions.includes(path)
        ? f.permissions.filter((p) => p !== path)
        : [...f.permissions, path],
    }));
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

  function permissionSummary(perms: string[]): string {
    if (perms.length === 0) return "Sem acesso";
    if (perms.length === ALL_MENU_ITEMS.length) return "Acesso completo";
    return perms
      .map((p) => ALL_MENU_ITEMS.find((m) => m.path === p)?.label ?? p)
      .join(", ");
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
          <TabsTrigger value="perfis" className="rounded-lg">
            <ShieldHalf className="h-4 w-4 mr-1.5" />
            Perfis de Acesso
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="rounded-lg">
            <Users className="h-4 w-4 mr-1.5" />
            Usuários
          </TabsTrigger>
        </TabsList>

        {/* ── General tab ── */}
        <TabsContent value="geral" className="mt-4 space-y-4">
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
                  <div className="flex items-center gap-4">
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

        {/* ── Access Profiles tab ── */}
        <TabsContent value="perfis" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Perfis de Acesso</h2>
              <p className="text-sm text-muted-foreground">
                Crie perfis com permissões de menu e atribua-os aos usuários
              </p>
            </div>
            <Button onClick={openNewProfile} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Novo perfil
            </Button>
          </div>

          {loadingSettings ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : profiles.length === 0 ? (
            <Card className="rounded-xl border-dashed">
              <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
                <ShieldHalf className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum perfil criado ainda.</p>
                <p className="text-xs text-muted-foreground">
                  Crie perfis para facilitar a atribuição de permissões aos usuários.
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={openNewProfile}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar primeiro perfil
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {profiles.map((profile) => (
                <Card key={profile.id} className="rounded-xl">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShieldHalf className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{profile.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {profile.permissions.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Sem acesso a nenhuma página</span>
                            ) : profile.permissions.length === ALL_MENU_ITEMS.length ? (
                              <Badge variant="secondary" className="text-[10px]">Acesso completo</Badge>
                            ) : (
                              profile.permissions.map((path) => {
                                const item = ALL_MENU_ITEMS.find((m) => m.path === path);
                                return item ? (
                                  <Badge key={path} variant="outline" className="text-[10px] px-1.5">
                                    {item.label}
                                  </Badge>
                                ) : null;
                              })
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditProfile(profile)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteProfile(profile.id)}
                          disabled={savingProfiles}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                const matchedProfile = profiles.find(
                  (p) =>
                    p.permissions.length === perms.length &&
                    p.permissions.every((x) => perms.includes(x))
                );
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
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge
                              variant={isAdmin ? "default" : "secondary"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {isAdmin ? "Administrador" : "Usuário"}
                            </Badge>
                            {!isAdmin && (
                              matchedProfile ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                                  <ShieldHalf className="h-2.5 w-2.5 mr-0.5" />
                                  {matchedProfile.name}
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  {permissionSummary(perms)}
                                </span>
                              )
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

      {/* ── Profile Dialog ── */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingProfile ? "Editar perfil" : "Novo perfil de acesso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do perfil *</Label>
              <Input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Editor, Produtor, Visitante..."
              />
            </div>
            <div className="space-y-2">
              <Label>Itens de menu visíveis</Label>
              <div className="rounded-xl border p-3 space-y-2.5">
                {ALL_MENU_ITEMS.map((item) => (
                  <div key={item.path} className="flex items-center gap-2.5">
                    <Checkbox
                      id={`pfperm-${item.path}`}
                      checked={profileForm.permissions.includes(item.path)}
                      onCheckedChange={() => toggleProfilePerm(item.path)}
                    />
                    <label htmlFor={`pfperm-${item.path}`} className="text-sm cursor-pointer select-none">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setProfileForm((f) => ({ ...f, permissions: ALL_MENU_ITEMS.map((m) => m.path) }))}
                >
                  Selecionar todos
                </button>
                <span className="text-xs text-muted-foreground">·</span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:underline"
                  onClick={() => setProfileForm((f) => ({ ...f, permissions: [] }))}
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancelar</Button>
            <Button onClick={saveProfile} disabled={savingProfiles}>
              {savingProfiles ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── User Dialog ── */}
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
              <PasswordInput
                value={userForm.password}
                onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                autoComplete="new-password"
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
              <Label>Perfil do sistema</Label>
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
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Perfil de acesso</Label>
                  <Select value={userForm.profileId} onValueChange={handleProfileSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil ou configure manualmente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  {profiles.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Crie perfis na aba "Perfis de Acesso" para agilizar a configuração.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Itens de menu visíveis</Label>
                  <div className="rounded-xl border p-3 space-y-2">
                    {ALL_MENU_ITEMS.map((item) => (
                      <div key={item.path} className="flex items-center gap-2">
                        <Checkbox
                          id={`uperm-${item.path}`}
                          checked={userForm.permissions.includes(item.path)}
                          onCheckedChange={() => toggleUserPermission(item.path)}
                        />
                        <label htmlFor={`uperm-${item.path}`} className="text-sm cursor-pointer select-none">
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-0.5">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setUserForm((f) => ({ ...f, profileId: "custom", permissions: ALL_MENU_ITEMS.map((m) => m.path) }))}
                    >
                      Selecionar todos
                    </button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => setUserForm((f) => ({ ...f, profileId: "", permissions: [] }))}
                    >
                      Limpar
                    </button>
                  </div>
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

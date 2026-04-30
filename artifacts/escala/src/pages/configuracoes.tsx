import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  RefreshCw,
  Check,
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";

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

const SPECIAL_CHARS = "!@#$%&*-_+=?";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

function generatePassword(): string {
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const all = UPPER + LOWER + DIGITS + SPECIAL_CHARS;
  const required = [rand(UPPER), rand(DIGITS), rand(SPECIAL_CHARS)];
  const extra = Array.from({ length: 7 }, () => rand(all));
  const combined = [...required, ...extra];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j]!, combined[i]!];
  }
  return combined.join("");
}

export default function Configuracoes() {
  const { user: currentUser } = useAuth();
  const { refreshSettings } = useSettings();

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [customForm, setCustomForm] = useState({
    company_name: "",
    system_name: "",
    logo_principal: "",
    logo_icone: "",
    favicon_url: "",
    primary_color: "#f59e0b",
    secondary_color: "#1e293b",
    footer_text: "",
  });
  const [logoPrincipalDrag, setLogoPrincipalDrag] = useState(false);
  const [logoIconeDrag, setLogoIconeDrag] = useState(false);
  const [faviconDrag, setFaviconDrag] = useState(false);

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
        setCustomForm({
          company_name: data["company_name"] ?? "",
          system_name: data["system_name"] ?? "",
          logo_principal: data["logo_principal"] ?? "",
          logo_icone: data["app_logo"] ?? data["logo_icone"] ?? "",
          favicon_url: data["favicon_url"] ?? "",
          primary_color: data["primary_color"] ?? "#f59e0b",
          secondary_color: data["secondary_color"] ?? "#1e293b",
          footer_text: data["footer_text"] ?? "",
        });
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
      .then((data) => setUsers(Array.isArray(data) ? data : []))
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

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.size > 1024 * 1024) { reject(new Error("Imagem muito grande. Use até 1 MB.")); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleLogoFileChange(field: "logo_principal" | "logo_icone" | "favicon_url", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await readFileAsBase64(file);
      setCustomForm((f) => ({ ...f, [field]: b64 }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao ler imagem");
    }
    e.target.value = "";
  }

  async function handleLogoDrop(field: "logo_principal" | "logo_icone" | "favicon_url", e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const b64 = await readFileAsBase64(file);
      setCustomForm((f) => ({ ...f, [field]: b64 }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao ler imagem");
    }
  }

  async function saveCustomization() {
    setSavingSettings(true);
    try {
      const res = await apiFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: customForm.company_name,
          system_name: customForm.system_name,
          logo_principal: customForm.logo_principal,
          app_logo: customForm.logo_icone,
          logo_icone: customForm.logo_icone,
          favicon_url: customForm.favicon_url,
          primary_color: customForm.primary_color,
          secondary_color: customForm.secondary_color,
          footer_text: customForm.footer_text,
        }),
      });
      if (!res.ok) throw new Error();
      await refreshSettings();
      toast.success("Personalização salva!");
    } catch {
      toast.error("Erro ao salvar personalização");
    } finally {
      setSavingSettings(false);
    }
  }

  function openNewUser() {
    setEditingUser(null);
    setUserForm({ username: "", displayName: "", password: generatePassword(), role: "user", profileId: "", permissions: [] });
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
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(userForm.password)) {
        toast.error("A senha deve conter pelo menos um caractere especial");
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
        <TabsContent value="geral" className="mt-4">
          {loadingSettings ? (
            <div className="space-y-4 max-w-2xl">
              {[1,2,3,4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">

              {/* ── Identidade da Empresa ── */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Identidade da Empresa</h2>
                  <p className="text-sm text-muted-foreground">Nome e identidade visual exibidos em todo o sistema.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Nome da empresa</Label>
                    <Input
                      value={customForm.company_name}
                      onChange={(e) => setCustomForm((f) => ({ ...f, company_name: e.target.value }))}
                      placeholder="Ex: Nagibe Produção"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome do sistema</Label>
                    <Input
                      value={customForm.system_name}
                      onChange={(e) => setCustomForm((f) => ({ ...f, system_name: e.target.value }))}
                      placeholder="Ex: ProTeam"
                    />
                  </div>
                </div>

                {/* Logo principal */}
                <div className="space-y-2">
                  <Label>Logo principal</Label>
                  <label
                    htmlFor="logo-principal-file"
                    onDragOver={(e) => { e.preventDefault(); setLogoPrincipalDrag(true); }}
                    onDragLeave={() => setLogoPrincipalDrag(false)}
                    onDrop={(e) => { setLogoPrincipalDrag(false); handleLogoDrop("logo_principal", e); }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors h-28 ${logoPrincipalDrag ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"}`}
                  >
                    {customForm.logo_principal ? (
                      <img src={customForm.logo_principal} alt="Logo principal" className="max-h-20 max-w-full object-contain rounded" />
                    ) : (
                      <>
                        <ImagePlus className="h-7 w-7 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">Clique para escolher uma imagem</span>
                        <span className="text-xs text-muted-foreground">ou arraste e solte aqui</span>
                        <span className="text-xs text-muted-foreground/60">PNG, JPG, SVG, WEBP</span>
                      </>
                    )}
                    <input id="logo-principal-file" type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleLogoFileChange("logo_principal", e)} />
                  </label>
                  {customForm.logo_principal && (
                    <button type="button" className="text-xs text-destructive hover:underline flex items-center gap-1"
                      onClick={() => setCustomForm((f) => ({ ...f, logo_principal: "" }))}>
                      <X className="h-3 w-3" /> Remover
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Input
                    value={customForm.logo_principal.startsWith("data:") ? "" : customForm.logo_principal}
                    onChange={(e) => setCustomForm((f) => ({ ...f, logo_principal: e.target.value }))}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">Exibida na tela de login e cabeçalho. Recomendado: 200×60px, fundo transparente.</p>
                </div>

                {/* Logo reduzida */}
                <div className="space-y-2">
                  <Label>Logo reduzida (ícone)</Label>
                  <label
                    htmlFor="logo-icone-file"
                    onDragOver={(e) => { e.preventDefault(); setLogoIconeDrag(true); }}
                    onDragLeave={() => setLogoIconeDrag(false)}
                    onDrop={(e) => { setLogoIconeDrag(false); handleLogoDrop("logo_icone", e); }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors h-28 ${logoIconeDrag ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"}`}
                  >
                    {customForm.logo_icone ? (
                      <img src={customForm.logo_icone} alt="Logo ícone" className="max-h-20 max-w-full object-contain rounded" />
                    ) : (
                      <>
                        <ImagePlus className="h-7 w-7 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">Clique para escolher uma imagem</span>
                        <span className="text-xs text-muted-foreground">ou arraste e solte aqui</span>
                        <span className="text-xs text-muted-foreground/60">PNG, JPG, SVG, WEBP</span>
                      </>
                    )}
                    <input id="logo-icone-file" type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleLogoFileChange("logo_icone", e)} />
                  </label>
                  {customForm.logo_icone && (
                    <button type="button" className="text-xs text-destructive hover:underline flex items-center gap-1"
                      onClick={() => setCustomForm((f) => ({ ...f, logo_icone: "" }))}>
                      <X className="h-3 w-3" /> Remover
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Input
                    value={customForm.logo_icone.startsWith("data:") ? "" : customForm.logo_icone}
                    onChange={(e) => setCustomForm((f) => ({ ...f, logo_icone: e.target.value }))}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">Exibida na sidebar mobile. Recomendado: 40×40px quadrado.</p>
                </div>

                {/* Favicon */}
                <div className="space-y-2">
                  <Label>Favicon (ícone da aba do navegador)</Label>
                  <label
                    htmlFor="favicon-file"
                    onDragOver={(e) => { e.preventDefault(); setFaviconDrag(true); }}
                    onDragLeave={() => setFaviconDrag(false)}
                    onDrop={(e) => { setFaviconDrag(false); handleLogoDrop("favicon_url", e); }}
                    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors h-28 ${faviconDrag ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"}`}
                  >
                    {customForm.favicon_url ? (
                      <img src={customForm.favicon_url} alt="Favicon" className="max-h-20 max-w-full object-contain rounded" />
                    ) : (
                      <>
                        <ImagePlus className="h-7 w-7 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground font-medium">Clique para escolher uma imagem</span>
                        <span className="text-xs text-muted-foreground">ou arraste e solte aqui</span>
                        <span className="text-xs text-muted-foreground/60">PNG, ICO, SVG</span>
                      </>
                    )}
                    <input id="favicon-file" type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleLogoFileChange("favicon_url", e)} />
                  </label>
                  {customForm.favicon_url && (
                    <button type="button" className="text-xs text-destructive hover:underline flex items-center gap-1"
                      onClick={() => setCustomForm((f) => ({ ...f, favicon_url: "" }))}>
                      <X className="h-3 w-3" /> Remover
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">ou cole uma URL</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <Input
                    value={customForm.favicon_url.startsWith("data:") ? "" : customForm.favicon_url}
                    onChange={(e) => setCustomForm((f) => ({ ...f, favicon_url: e.target.value }))}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">Recomendado: PNG quadrado 32×32 ou 64×64 px.</p>
                </div>
              </div>

              <div className="border-t" />

              {/* ── Cores do Sistema ── */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Cores do Sistema</h2>
                  <p className="text-sm text-muted-foreground">Cores exibidas no cabeçalho, sidebar e botões.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Cor principal</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customForm.primary_color}
                        onChange={(e) => setCustomForm((f) => ({ ...f, primary_color: e.target.value }))}
                        className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <Input
                        value={customForm.primary_color}
                        onChange={(e) => setCustomForm((f) => ({ ...f, primary_color: e.target.value }))}
                        placeholder="#f59e0b"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor secundária</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customForm.secondary_color}
                        onChange={(e) => setCustomForm((f) => ({ ...f, secondary_color: e.target.value }))}
                        className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                      />
                      <Input
                        value={customForm.secondary_color}
                        onChange={(e) => setCustomForm((f) => ({ ...f, secondary_color: e.target.value }))}
                        placeholder="#1e293b"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t" />

              {/* ── Rodapé ── */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Rodapé</h2>
                </div>
                <div className="space-y-1.5">
                  <Label>Texto do rodapé (opcional)</Label>
                  <Input
                    value={customForm.footer_text}
                    onChange={(e) => setCustomForm((f) => ({ ...f, footer_text: e.target.value }))}
                    placeholder="© 2024 Sua Empresa. Todos os direitos reservados."
                  />
                </div>
              </div>

              {/* Save button */}
              <Button onClick={saveCustomization} disabled={savingSettings} className="w-full sm:w-auto">
                {savingSettings ? "Salvando..." : "Salvar personalização"}
              </Button>
            </div>
          )}
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
                                  <Badge key={path} variant="secondary" className="text-[10px] px-1.5">
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
                            {isMe && <Badge variant="secondary" className="text-[10px] px-1.5">você</Badge>}
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
        <DialogContent className="sm:max-w-lg">
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
              <div className="flex items-center justify-between">
                <Label>Permissões por módulo</Label>
                <div className="flex gap-3">
                  <button type="button" className="text-xs text-primary hover:underline"
                    onClick={() => setProfileForm((f) => ({ ...f, permissions: ALL_MENU_ITEMS.map((m) => m.path) }))}>
                    Todos
                  </button>
                  <button type="button" className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setProfileForm((f) => ({ ...f, permissions: [] }))}>
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Módulo</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-16">Acesso</th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-12">Todos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_MENU_ITEMS.map((item, idx) => {
                      const on = profileForm.permissions.includes(item.path);
                      return (
                        <tr key={item.path} className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="px-3 py-2.5 text-sm">{item.label}</td>
                          <td className="text-center px-3 py-2.5">
                            <Switch
                              checked={on}
                              onCheckedChange={() => toggleProfilePerm(item.path)}
                            />
                          </td>
                          <td className="text-center px-3 py-2.5">
                            {on && <Check className="h-3.5 w-3.5 text-primary mx-auto" />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="flex items-center justify-between">
                <Label>{editingUser ? "Nova senha (deixe em branco para manter)" : "Senha *"}</Label>
                <button
                  type="button"
                  onClick={() => setUserForm((f) => ({ ...f, password: generatePassword() }))}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  Gerar senha
                </button>
              </div>
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
                    { ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(userForm.password), label: "Pelo menos 1 caractere especial" },
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Permissões por módulo</Label>
                    <div className="flex gap-3">
                      <button type="button" className="text-xs text-primary hover:underline"
                        onClick={() => setUserForm((f) => ({ ...f, profileId: "custom", permissions: ALL_MENU_ITEMS.map((m) => m.path) }))}>
                        Todos
                      </button>
                      <button type="button" className="text-xs text-muted-foreground hover:underline"
                        onClick={() => setUserForm((f) => ({ ...f, profileId: "", permissions: [] }))}>
                        Nenhum
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 border-b">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Módulo</th>
                          <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-16">Acesso</th>
                          <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground w-12">Todos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ALL_MENU_ITEMS.map((item, idx) => {
                          const on = userForm.permissions.includes(item.path);
                          return (
                            <tr key={item.path} className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                              <td className="px-3 py-2.5 text-sm">{item.label}</td>
                              <td className="text-center px-3 py-2.5">
                                <Switch
                                  checked={on}
                                  onCheckedChange={() => toggleUserPermission(item.path)}
                                />
                              </td>
                              <td className="text-center px-3 py-2.5">
                                {on && <Check className="h-3.5 w-3.5 text-primary mx-auto" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

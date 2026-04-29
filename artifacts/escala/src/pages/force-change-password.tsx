import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

export default function ForceChangePassword() {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const rules = [
    { ok: newPassword.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[A-Z]/.test(newPassword), label: "Pelo menos 1 letra maiúscula" },
    { ok: /\d/.test(newPassword), label: "Pelo menos 1 número" },
    { ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword), label: "Pelo menos 1 caractere especial (!@#$...)" },
  ];
  const allRulesOk = rules.every((r) => r.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!allRulesOk) {
      setError("A nova senha não atende os requisitos.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Redefinição de senha obrigatória</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, <span className="font-medium">{user?.displayName}</span>. Por segurança, você precisa criar uma nova senha antes de continuar.
          </p>
        </div>

        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Criar nova senha</CardTitle>
            <CardDescription className="text-xs">A senha deve ser diferente da senha fornecida pelo administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current">Senha atual (fornecida pelo admin)</Label>
                <PasswordInput
                  id="current"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new">Nova senha</Label>
                <PasswordInput
                  id="new"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                {newPassword && (
                  <div className="space-y-1 pt-1">
                    {rules.map(({ ok, label }) => (
                      <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${ok ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar nova senha</Label>
                <PasswordInput
                  id="confirm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive mt-1">As senhas não coincidem</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !currentPassword || !allRulesOk || newPassword !== confirmPassword}
              >
                {loading ? "Salvando..." : "Definir nova senha e entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Não é você?{" "}
          <button onClick={() => logout()} className="underline hover:text-foreground transition-colors">
            Sair
          </button>
        </p>
      </div>
    </div>
  );
}

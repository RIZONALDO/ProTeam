import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState("ProTeam");
  const [appLogo, setAppLogo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: Record<string, string> | null) => {
        if (data?.["company_name"]) setAppName(data["company_name"]);
        if (data?.["app_logo"]) setAppLogo(data["app_logo"]);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          {appLogo ? (
            <img
              src={appLogo}
              alt={appName}
              className="h-16 w-16 object-contain rounded-xl"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-primary/15 flex items-center justify-center">
              <span className="text-2xl font-black text-primary select-none">
                {appName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-primary">{appName}</h1>
            <p className="text-muted-foreground text-sm mt-1">Faça login para continuar</p>
          </div>
        </div>
        <Card className="rounded-2xl shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Entrar</CardTitle>
            <CardDescription>Insira suas credenciais de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="seu.usuario"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

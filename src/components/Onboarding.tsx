import { useState } from "react";
import heroImg from "@/assets/onboarding-hero.jpg";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import { Scissors, Loader2 } from "lucide-react";

export function Onboarding() {
  const [mode, setMode] = useState<null | "signup" | "login">(null);
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle } = useApp();

  const [form, setForm] = useState({ name: "", email: "", phone: "", birthdate: "", password: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "signup") {
      if (!form.name || !form.email || !form.password) { toast.error("Preencha os campos obrigatórios"); setLoading(false); return; }
      const ok = await signup(form);
      if (!ok) toast.error("Não foi possível criar a conta. Verifique o e-mail.");
      else toast.success(`Bem-vindo, ${form.name.split(" ")[0]}!`);
    } else {
      const ok = await login(form.email, form.password);
      if (!ok) toast.error("Credenciais inválidas");
      else toast.success("Login efetuado");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    try { await loginWithGoogle(); }
    catch { toast.error("Falha ao entrar com Google"); setLoading(false); }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <div className="relative flex-1 overflow-hidden">
        <img src={heroImg} alt="Barbearia" className="absolute inset-0 h-full w-full object-cover grayscale" width={1024} height={1408} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-background" />
        <div className="relative z-10 flex h-full flex-col items-start justify-end p-7 pb-8">
          <div className="mb-3 flex items-center gap-2 text-gold">
            <Scissors className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em]">Premium</span>
          </div>
          <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight">
            Navalha<br /><span className="text-gold">& Co.</span>
          </h1>
          <p className="mt-3 max-w-xs text-sm text-white/70">
            Sua barbearia premium. Agende, assine o clube e cuide do seu estilo.
          </p>
        </div>
      </div>

      <div className="space-y-3 bg-background px-6 pb-10 pt-6">
        <Button onClick={handleGoogle} disabled={loading} variant="outline" className="h-14 w-full rounded-2xl border-border bg-card text-base font-semibold hover:bg-secondary">
          <GoogleIcon /> Continuar com Google
        </Button>
        <Button onClick={() => setMode("signup")} className="h-14 w-full rounded-2xl bg-gold text-base font-semibold text-black hover:opacity-90">
          Criar conta com e-mail
        </Button>
        <Button onClick={() => setMode("login")} variant="ghost" className="h-12 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
          Já tenho conta
        </Button>
      </div>

      <Drawer open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <DrawerContent className="bg-card">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-2xl">
              {mode === "signup" ? "Criar conta" : "Bem-vindo de volta"}
            </DrawerTitle>
            <DrawerDescription>
              {mode === "signup" ? "Preencha seus dados para começar." : "Acesse sua conta para continuar."}
            </DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-8">
            {mode === "signup" && (
              <>
                <Field label="Nome completo"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="João da Silva" /></Field>
                <Field label="Telefone"><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" /></Field>
                <Field label="Data de nascimento"><Input type="date" value={form.birthdate} onChange={e => setForm({ ...form, birthdate: e.target.value })} /></Field>
              </>
            )}
            <Field label="E-mail"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="voce@email.com" /></Field>
            <Field label="Senha"><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></Field>
            <Button type="submit" disabled={loading} className="mt-2 h-12 w-full rounded-2xl bg-gold font-semibold text-black hover:opacity-90">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "signup" ? "Criar minha conta" : "Entrar"}
            </Button>
            <button type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="block w-full text-center text-sm text-muted-foreground hover:text-foreground">
              {mode === "signup" ? "Já tem conta? Fazer login" : "Não tem conta? Criar agora"}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.2-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.8 0 19.5-8.7 19.5-19.5 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.4 4.5 9.9 8.8 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-1.9 1.3-4.3 2.1-7 2.1-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6 5.1c-.4.4 6.5-4.7 6.5-14.6 0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

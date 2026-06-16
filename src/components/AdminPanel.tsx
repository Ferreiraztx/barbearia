import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Scissors, ShieldCheck, Users, CalendarDays, Trash2, ArrowLeft, BarChart3, DollarSign, Clock, UserCog, Download, Printer } from "lucide-react";
import { format, parseISO, isToday, isThisWeek, isThisMonth, subDays, startOfDay, startOfMonth, startOfYear, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

type ApptRow = {
  id: string; user_id: string; date: string; time: string;
  service_name: string; barber_name: string; barber_id: string;
  price: number; status: string; created_at: string;
};
type Barber = { id: string; name: string; active: boolean; avatar_url: string | null };
type Service = { id: string; name: string; description: string; price: number; active: boolean };
type Profile = { id: string; name: string; email: string; phone: string; plan: string; created_at: string };
type WorkingHour = { id: string; day_of_week: number; open: boolean; start_time: string; end_time: string };
type RoleRow = { id: string; user_id: string; role: string };

function fmtBRL(n: number) {
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdminPanel() {
  const { user, loading, isAdmin, bootstrapAdmin, logout } = useApp();
  const navigate = useNavigate();
  const search = useSearch({ from: "/admin" }) as { setup?: string };
  const setupMode = search.setup === "1";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      toast.error("Faça login para acessar o painel administrativo.");
      navigate({ to: "/", replace: true });
      return;
    }
    if (!isAdmin && !setupMode) {
      toast.error("Acesso restrito a administradores.");
      navigate({ to: "/", replace: true });
    }
  }, [loading, user, isAdmin, setupMode, navigate]);

  if (loading || !user || (!isAdmin && !setupMode)) {
    return <div className="grid min-h-[100dvh] place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-background p-6 text-center">
        <div className="max-w-sm">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gold" />
          <h1 className="font-display text-2xl font-bold">Configuração inicial</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta ({user.email}) ainda não é administradora. Se este é o primeiro acesso ao sistema, você pode se promover ao primeiro admin.
          </p>
          <Button
            onClick={async () => {
              const ok = await bootstrapAdmin();
              if (ok) toast.success("Você agora é o administrador!");
              else { toast.error("Já existe um administrador. Peça acesso a ele."); navigate({ to: "/", replace: true }); }
            }}
            className="mt-5 h-11 rounded-2xl bg-gold font-semibold text-black hover:opacity-90"
          >
            Tornar-me administrador
          </Button>
          <div className="mt-3">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Voltar ao app</Link>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={logout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur lg:px-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="grid h-10 w-10 place-items-center rounded-xl bg-card hover:bg-secondary" aria-label="Voltar ao app">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="font-display text-lg leading-tight">Painel administrativo</div>
            <div className="text-[11px] uppercase tracking-wider text-gold">Navalha & Co.</div>
          </div>
        </div>
        <button onClick={onLogout} className="text-xs text-muted-foreground hover:text-foreground">Sair</button>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-6 lg:px-10">
        <Tabs defaultValue="dashboard">
          <div className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
            <TabsList className="inline-flex w-max gap-1 rounded-2xl bg-card p-1 lg:grid lg:w-full lg:grid-cols-7">
              <TabsTrigger value="dashboard" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><BarChart3 className="mr-1.5 h-4 w-4" />Visão</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><DollarSign className="mr-1.5 h-4 w-4" />Faturamento</TabsTrigger>
              <TabsTrigger value="appointments" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><CalendarDays className="mr-1.5 h-4 w-4" />Agenda</TabsTrigger>
              <TabsTrigger value="clients" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><Users className="mr-1.5 h-4 w-4" />Clientes</TabsTrigger>
              <TabsTrigger value="barbers" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><Scissors className="mr-1.5 h-4 w-4" />Barbeiros</TabsTrigger>
              <TabsTrigger value="services" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><Scissors className="mr-1.5 h-4 w-4" />Serviços</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black"><Clock className="mr-1.5 h-4 w-4" />Ajustes</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="mt-6"><DashboardView /></TabsContent>
          <TabsContent value="billing" className="mt-6"><BillingView /></TabsContent>
          <TabsContent value="appointments" className="mt-6"><AppointmentsTable /></TabsContent>
          <TabsContent value="clients" className="mt-6"><ClientsView /></TabsContent>
          <TabsContent value="barbers" className="mt-6"><BarbersAdmin /></TabsContent>
          <TabsContent value="services" className="mt-6"><ServicesAdmin /></TabsContent>
          <TabsContent value="settings" className="mt-6 space-y-8"><WorkingHoursAdmin /><AdminsManager /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function useAllAppointments() {
  const [rows, setRows] = useState<ApptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("appointments").select("*").order("date", { ascending: false }).order("time", { ascending: false });
    setRows((data ?? []) as ApptRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { rows, loading, refresh };
}

function DashboardView() {
  const { rows, loading } = useAllAppointments();
  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  const today = rows.filter(r => isToday(parseISO(r.date)));
  const week = rows.filter(r => isThisWeek(parseISO(r.date), { locale: ptBR }));
  const month = rows.filter(r => isThisMonth(parseISO(r.date)));
  const revenue = month.reduce((s, r) => s + Number(r.price), 0);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Hoje" value={today.length} hint={`${today.filter(r => r.status === "confirmed").length} confirmados`} />
      <StatCard label="Esta semana" value={week.length} />
      <StatCard label="Este mês" value={month.length} />
      <StatCard label="Receita do mês" value={fmtBRL(revenue)} accent />
    </div>
  );
}
function StatCard({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${accent ? "border-gold/40 bg-gradient-to-br from-zinc-900 to-black" : "border-border bg-card"}`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-3xl font-bold ${accent ? "text-gold" : ""}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

type Period = "7d" | "30d" | "month" | "year" | "all";

function BillingView() {
  const { rows, loading } = useAllAppointments();
  const [period, setPeriod] = useState<Period>("30d");

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    if (period === "7d") from = startOfDay(subDays(now, 6));
    else if (period === "30d") from = startOfDay(subDays(now, 29));
    else if (period === "month") from = startOfMonth(now);
    else if (period === "year") from = startOfYear(now);
    return rows.filter(r => !from || parseISO(r.date) >= from!);
  }, [rows, period]);

  const total = filtered.reduce((s, r) => s + Number(r.price), 0);
  const avgTicket = filtered.length ? total / filtered.length : 0;

  const timeline = useMemo(() => {
    if (filtered.length === 0) return [];
    const useMonths = period === "year" || period === "all";
    const dates = filtered.map(r => parseISO(r.date));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    const buckets = useMonths
      ? eachMonthOfInterval({ start: startOfMonth(min), end: max })
      : eachDayOfInterval({ start: min, end: max });
    return buckets.map(d => {
      const key = useMonths ? format(d, "yyyy-MM") : format(d, "yyyy-MM-dd");
      const label = useMonths ? format(d, "MMM/yy", { locale: ptBR }) : format(d, "dd/MM");
      const sum = filtered
        .filter(r => (useMonths ? r.date.slice(0, 7) === key : r.date === key))
        .reduce((s, r) => s + Number(r.price), 0);
      return { label, total: Number(sum.toFixed(2)) };
    });
  }, [filtered, period]);

  const byBarber = useMemo(() => {
    const m = new Map<string, { name: string; total: number; count: number }>();
    filtered.forEach(r => {
      const cur = m.get(r.barber_name) ?? { name: r.barber_name, total: 0, count: 0 };
      cur.total += Number(r.price); cur.count += 1;
      m.set(r.barber_name, cur);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  const byService = useMemo(() => {
    const m = new Map<string, { name: string; total: number; count: number }>();
    filtered.forEach(r => {
      const cur = m.get(r.service_name) ?? { name: r.service_name, total: 0, count: 0 };
      cur.total += Number(r.price); cur.count += 1;
      m.set(r.service_name, cur);
    });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filtered]);

  function exportCSV() {
    const header = ["Data", "Hora", "Cliente_ID", "Serviço", "Barbeiro", "Preço", "Status"];
    const lines = filtered.map(r => [
      r.date, String(r.time).slice(0, 5), r.user_id, r.service_name, r.barber_name,
      Number(r.price).toFixed(2).replace(".", ","), r.status,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"));
    const csv = "\ufeff" + [header.join(";"), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `faturamento-${period}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6 print:bg-white print:text-black">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="h-10 w-44 rounded-2xl bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Este mês</SelectItem>
            <SelectItem value="year">Este ano</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={exportCSV} variant="outline" className="rounded-2xl"><Download className="mr-1.5 h-4 w-4" />CSV</Button>
          <Button onClick={() => window.print()} variant="outline" className="rounded-2xl"><Printer className="mr-1.5 h-4 w-4" />Imprimir</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Receita" value={fmtBRL(total)} accent />
        <StatCard label="Atendimentos" value={filtered.length} />
        <StatCard label="Ticket médio" value={fmtBRL(avgTicket)} />
      </div>

      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg">Receita por período</h3>
          <span className="text-xs text-muted-foreground">{timeline.length} pontos</span>
        </div>
        {timeline.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sem dados no período.</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$${v}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: number) => fmtBRL(v)} />
                <Line type="monotone" dataKey="total" stroke="#d4af37" strokeWidth={2} dot={{ fill: "#d4af37", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Por barbeiro" rows={byBarber} />
        <BreakdownCard title="Por serviço" rows={byService} />
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: { name: string; total: number; count: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.total));
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <h3 className="mb-3 font-display text-lg">{title}</h3>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">Sem dados.</div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `R$${v}`} domain={[0, max]} />
              <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={110} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="total" fill="#d4af37" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function AppointmentsTable() {
  const { rows, loading, refresh } = useAllAppointments();
  async function cancel(id: string) {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) toast.error("Erro ao cancelar"); else { toast.success("Agendamento removido"); refresh(); }
  }
  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (rows.length === 0) return <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Nenhum agendamento ainda.</div>;
  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-3 text-left">Data</th><th className="px-4 py-3 text-left">Hora</th><th className="px-4 py-3 text-left">Serviço</th><th className="px-4 py-3 text-left">Barbeiro</th><th className="px-4 py-3 text-left">Valor</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3" /></tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-3">{format(parseISO(r.date), "dd/MM/yyyy")}</td>
              <td className="px-4 py-3">{typeof r.time === "string" ? r.time.slice(0,5) : r.time}</td>
              <td className="px-4 py-3">{r.service_name}</td>
              <td className="px-4 py-3">{r.barber_name}</td>
              <td className="px-4 py-3 font-semibold text-gold">{fmtBRL(Number(r.price))}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase">{r.status}</span></td>
              <td className="px-4 py-3 text-right">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl bg-card">
                    <AlertDialogHeader><AlertDialogTitle>Remover agendamento?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => cancel(r.id)} className="rounded-2xl bg-destructive">Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ClientsView() {
  const [clients, setClients] = useState<Profile[]>([]);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [p, a] = await Promise.all([
        supabase.from("profiles").select("id,name,email,phone,plan,created_at").order("created_at", { ascending: false }),
        supabase.from("appointments").select("*"),
      ]);
      setClients((p.data ?? []) as Profile[]);
      setAppts((a.data ?? []) as ApptRow[]);
      setLoading(false);
    })();
  }, []);

  const enriched = useMemo(() => {
    const map = new Map<string, { count: number; total: number; last: string | null }>();
    appts.forEach(a => {
      const cur = map.get(a.user_id) ?? { count: 0, total: 0, last: null as string | null };
      cur.count += 1; cur.total += Number(a.price);
      if (!cur.last || a.date > cur.last) cur.last = a.date;
      map.set(a.user_id, cur);
    });
    return clients.map(c => ({ ...c, stats: map.get(c.id) ?? { count: 0, total: 0, last: null } }));
  }, [clients, appts]);

  const filtered = enriched.filter(c => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const openClient = openId ? enriched.find(c => c.id === openId) : null;
  const openHistory = openId ? appts.filter(a => a.user_id === openId).sort((a, b) => b.date.localeCompare(a.date)) : [];

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, email ou telefone" className="h-11 rounded-2xl" />
        <div className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} cliente(s)</div>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3 text-left">Cliente</th><th className="px-4 py-3 text-left">Contato</th><th className="px-4 py-3 text-left">Plano</th><th className="px-4 py-3 text-left">Atend.</th><th className="px-4 py-3 text-left">Gasto total</th><th className="px-4 py-3 text-left">Última visita</th><th className="px-4 py-3" /></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email}<br /><span className="text-xs">{c.phone}</span></td>
                <td className="px-4 py-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase">{c.plan}</span></td>
                <td className="px-4 py-3">{c.stats.count}</td>
                <td className="px-4 py-3 font-semibold text-gold">{fmtBRL(c.stats.total)}</td>
                <td className="px-4 py-3">{c.stats.last ? format(parseISO(c.stats.last), "dd/MM/yyyy") : "—"}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => setOpenId(c.id)} className="text-xs text-gold hover:underline">Histórico</button></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!openId} onOpenChange={o => !o && setOpenId(null)}>
        <DialogContent className="max-h-[80vh] overflow-auto rounded-3xl bg-card">
          <DialogHeader><DialogTitle>{openClient?.name || openClient?.email}</DialogTitle></DialogHeader>
          {openClient && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>Email: <span className="text-foreground">{openClient.email}</span></div>
                <div>Telefone: <span className="text-foreground">{openClient.phone || "—"}</span></div>
                <div>Plano: <span className="text-foreground uppercase">{openClient.plan}</span></div>
                <div>Cliente desde: <span className="text-foreground">{format(parseISO(openClient.created_at), "dd/MM/yyyy")}</span></div>
                <div>Atendimentos: <span className="text-foreground">{openClient.stats.count}</span></div>
                <div>Gasto total: <span className="font-semibold text-gold">{fmtBRL(openClient.stats.total)}</span></div>
              </div>
              <div className="mt-2 border-t border-border pt-3">
                <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Histórico</div>
                {openHistory.length === 0 ? (
                  <div className="text-muted-foreground">Sem agendamentos.</div>
                ) : openHistory.map(h => (
                  <div key={h.id} className="flex items-center justify-between border-b border-border/40 py-2">
                    <div>
                      <div className="font-medium">{h.service_name}</div>
                      <div className="text-xs text-muted-foreground">{format(parseISO(h.date), "dd/MM/yyyy")} • {String(h.time).slice(0,5)} • {h.barber_name}</div>
                    </div>
                    <div className="font-semibold text-gold">{fmtBRL(Number(h.price))}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BarbersAdmin() {
  const [rows, setRows] = useState<Barber[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("barbers").select("*").order("created_at");
    setRows((data ?? []) as Barber[]);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function add() {
    if (!name.trim()) return;
    const { error } = await supabase.from("barbers").insert({ name: name.trim(), active: true });
    if (error) toast.error("Erro: " + error.message); else { toast.success("Barbeiro adicionado"); setName(""); setOpen(false); refresh(); }
  }
  async function toggle(b: Barber) {
    const { error } = await supabase.from("barbers").update({ active: !b.active }).eq("id", b.id);
    if (!error) refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) toast.error("Não foi possível remover (talvez tenha agendamentos vinculados)"); else { toast.success("Removido"); refresh(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-2xl bg-gold text-black hover:opacity-90"><Plus className="mr-1.5 h-4 w-4" /> Novo barbeiro</Button></DialogTrigger>
          <DialogContent className="rounded-3xl bg-card">
            <DialogHeader><DialogTitle>Novo barbeiro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Lucas Silva" className="mt-1 rounded-2xl" /></div>
              <Button onClick={add} className="w-full rounded-2xl bg-gold text-black hover:opacity-90">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(b => (
          <div key={b.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gold/20 font-semibold text-gold">{b.name.split(" ").map(x => x[0]).join("").slice(0,2)}</div>
                <div className="font-semibold">{b.name}</div>
              </div>
              <Switch checked={b.active} onCheckedChange={() => toggle(b)} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{b.active ? "Ativo" : "Inativo"}</span>
              <button onClick={() => remove(b.id)} className="text-destructive hover:underline">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesAdmin() {
  const [rows, setRows] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "" });
  const refresh = useCallback(async () => {
    const { data } = await supabase.from("services").select("*").order("created_at");
    setRows((data ?? []).map((s: { id: string; name: string; description: string | null; price: number; active: boolean }) => ({ ...s, description: s.description ?? "", price: Number(s.price) })));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function add() {
    const p = parseFloat(form.price.replace(",", "."));
    if (!form.name.trim() || isNaN(p)) return toast.error("Preencha nome e preço");
    const { error } = await supabase.from("services").insert({ name: form.name.trim(), description: form.description.trim(), price: p, active: true });
    if (error) toast.error(error.message); else { toast.success("Serviço criado"); setForm({ name: "", description: "", price: "" }); setOpen(false); refresh(); }
  }
  async function toggle(s: Service) {
    await supabase.from("services").update({ active: !s.active }).eq("id", s.id);
    refresh();
  }
  async function updatePrice(s: Service, value: string) {
    const p = parseFloat(value.replace(",", "."));
    if (isNaN(p)) return;
    await supabase.from("services").update({ price: p }).eq("id", s.id);
    refresh();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) toast.error("Não foi possível remover"); else refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-2xl bg-gold text-black hover:opacity-90"><Plus className="mr-1.5 h-4 w-4" /> Novo serviço</Button></DialogTrigger>
          <DialogContent className="rounded-3xl bg-card">
            <DialogHeader><DialogTitle>Novo serviço</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 rounded-2xl" /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 rounded-2xl" /></div>
              <div><Label>Preço (R$)</Label><Input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="60,00" className="mt-1 rounded-2xl" /></div>
              <Button onClick={add} className="w-full rounded-2xl bg-gold text-black hover:opacity-90">Adicionar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map(s => (
          <div key={s.id} className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.description}</div>
                <div className="mt-3 flex items-center gap-2">
                  <Label className="text-xs">Preço:</Label>
                  <Input defaultValue={s.price.toString().replace(".", ",")} onBlur={e => updatePrice(s, e.target.value)} className="h-9 w-28 rounded-xl" />
                </div>
              </div>
              <Switch checked={s.active} onCheckedChange={() => toggle(s)} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{s.active ? "Ativo" : "Inativo"}</span>
              <button onClick={() => remove(s.id)} className="text-destructive hover:underline">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function WorkingHoursAdmin() {
  const [rows, setRows] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("working_hours").select("*").order("day_of_week");
    let list = (data ?? []) as WorkingHour[];
    // Ensure all 7 days exist
    const missing = [0,1,2,3,4,5,6].filter(d => !list.find(r => r.day_of_week === d));
    if (missing.length) {
      await supabase.from("working_hours").insert(missing.map(d => ({ day_of_week: d, open: d !== 0, start_time: "09:00", end_time: "19:00" })));
      const { data: d2 } = await supabase.from("working_hours").select("*").order("day_of_week");
      list = (d2 ?? []) as WorkingHour[];
    }
    setRows(list);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function update(id: string, patch: Partial<WorkingHour>) {
    const { error } = await supabase.from("working_hours").update(patch).eq("id", id);
    if (error) toast.error(error.message); else setRows(rows => rows.map(r => r.id === id ? { ...r, ...patch } as WorkingHour : r));
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-gold" />
        <h3 className="font-display text-lg">Horários de funcionamento</h3>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-secondary/40 p-3">
            <div className="w-24 font-medium">{DAYS[r.day_of_week]}</div>
            <Switch checked={r.open} onCheckedChange={v => update(r.id, { open: v })} />
            <span className="text-xs text-muted-foreground">{r.open ? "Aberto" : "Fechado"}</span>
            <div className="ml-auto flex items-center gap-2">
              <Input type="time" defaultValue={String(r.start_time).slice(0,5)} onBlur={e => update(r.id, { start_time: e.target.value })} disabled={!r.open} className="h-9 w-28 rounded-xl" />
              <span className="text-muted-foreground">às</span>
              <Input type="time" defaultValue={String(r.end_time).slice(0,5)} onBlur={e => update(r.id, { end_time: e.target.value })} disabled={!r.open} className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminsManager() {
  const { user } = useApp();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [r, p] = await Promise.all([
      supabase.from("user_roles").select("*").eq("role", "admin"),
      supabase.from("profiles").select("id,name,email,phone,plan,created_at"),
    ]);
    setRoles((r.data ?? []) as RoleRow[]);
    setProfiles((p.data ?? []) as Profile[]);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const profileById = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);

  async function promote() {
    const e = email.trim().toLowerCase();
    if (!e) return;
    const p = profiles.find(pf => pf.email.toLowerCase() === e);
    if (!p) return toast.error("Usuário não encontrado. Ele precisa ter conta criada.");
    const { error } = await supabase.from("user_roles").insert({ user_id: p.id, role: "admin" });
    if (error) {
      if (error.code === "23505") toast.info("Esse usuário já é admin.");
      else toast.error(error.message);
    } else {
      toast.success(`${p.name || p.email} agora é admin`);
      setEmail(""); refresh();
    }
  }

  async function revoke(userId: string) {
    if (userId === user?.id) return toast.error("Você não pode revogar a si mesmo.");
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    if (error) toast.error(error.message); else { toast.success("Acesso removido"); refresh(); }
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;

  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <UserCog className="h-5 w-5 text-gold" />
        <h3 className="font-display text-lg">Administradores</h3>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="h-10 flex-1 rounded-2xl" />
        <Button onClick={promote} className="rounded-2xl bg-gold text-black hover:opacity-90"><Plus className="mr-1.5 h-4 w-4" />Promover</Button>
      </div>
      <div className="space-y-2">
        {roles.map(r => {
          const p = profileById.get(r.user_id);
          const isSelf = r.user_id === user?.id;
          return (
            <div key={r.id} className="flex items-center justify-between rounded-2xl bg-secondary/40 p-3">
              <div>
                <div className="font-medium">{p?.name || "—"} {isSelf && <span className="ml-1 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase text-gold">Você</span>}</div>
                <div className="text-xs text-muted-foreground">{p?.email || r.user_id}</div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button disabled={isSelf} className="text-xs text-destructive hover:underline disabled:opacity-30 disabled:no-underline">Revogar</button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl bg-card">
                  <AlertDialogHeader><AlertDialogTitle>Revogar acesso admin?</AlertDialogTitle><AlertDialogDescription>O usuário perderá acesso ao painel.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revoke(r.user_id)} className="rounded-2xl bg-destructive">Revogar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
        {roles.length === 0 && <div className="text-center text-sm text-muted-foreground">Sem administradores.</div>}
      </div>
    </div>
  );
}

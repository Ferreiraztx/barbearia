import { useMemo, useState } from "react";
import { Menu, Plus, Calendar as CalIcon, Scissors, Sparkles, CreditCard, Check, Shield, CalendarClock, X, Home, User as UserIcon, LogOut } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { NewAppointment } from "./NewAppointment";
import { useApp, type Appointment, PLANS, type PlanId } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export type View = "home" | "appointments" | "club" | "plan" | "profile";

const NAV: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "appointments", label: "Agendamentos", icon: CalIcon },
  { id: "club", label: "Clube", icon: Sparkles },
  { id: "plan", label: "Plano", icon: CreditCard },
  { id: "profile", label: "Perfil", icon: UserIcon },
];

function fmtBRL(n: number) {
  return n === 0 ? "Grátis" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AppShell() {
  const [view, setView] = useState<View>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const { user, logout } = useApp();
  if (!user) return null;

  const titles: Record<View, string> = {
    home: "Início", appointments: "Agendamentos", club: "Clube Navalha", plan: "Meu Plano", profile: "Perfil",
  };

  const initials = user.name.split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase() || "U";

  return (
    <div className="min-h-[100dvh] bg-background lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-6">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-gold text-black">
            <Scissors className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-lg leading-tight">Navalha & Co.</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button key={id} onClick={() => setView(id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${active ? "bg-gold text-black" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <Icon className="h-5 w-5" /> {label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-sidebar-accent">
            <LogOut className="h-5 w-5" /> Sair
          </button>
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col lg:max-w-5xl">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur lg:px-10">
          <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-card hover:bg-secondary lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="font-display text-base tracking-wide lg:text-xl">{titles[view]}</div>
          <button onClick={() => setView("profile")} className="grid h-10 w-10 place-items-center rounded-full bg-gold font-semibold text-black">
            {initials}
          </button>
        </header>

        <main className="flex-1 px-5 pb-28 pt-5 lg:px-10 lg:pb-12">
          {view === "home" && <HomeView onNew={() => setNewOpen(true)} onSeeAll={() => setView("appointments")} onPlan={() => setView("plan")} />}
          {view === "appointments" && <AppointmentsView onNew={() => setNewOpen(true)} />}
          {view === "club" && <ClubView />}
          {view === "plan" && <PlanView />}
          {view === "profile" && <ProfileView />}
        </main>

        {view !== "profile" && (
          <button onClick={() => setNewOpen(true)}
            className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-gold px-6 py-3.5 font-semibold text-black shadow-2xl shadow-gold/30 transition active:scale-95 lg:hidden">
            <Plus className="h-5 w-5" /> Novo agendamento
          </button>
        )}
      </div>

      <Sidebar open={menuOpen} onOpenChange={setMenuOpen} view={view} setView={setView} />
      <NewAppointment open={newOpen} onOpenChange={setNewOpen} />
    </div>
  );
}

function useSplit() {
  const { appointments } = useApp();
  return useMemo(() => {
    const future = appointments.filter(a => !isPast(parseISO(`${a.date}T${a.time}`)));
    const past = appointments.filter(a => isPast(parseISO(`${a.date}T${a.time}`)));
    const sorter = (a: Appointment, b: Appointment) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
    return { future: future.sort(sorter), past: past.sort(sorter).reverse() };
  }, [appointments]);
}

function HomeView({ onNew, onSeeAll, onPlan }: { onNew: () => void; onSeeAll: () => void; onPlan: () => void }) {
  const { user } = useApp();
  const { future } = useSplit();
  const firstName = user!.name.split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const plan = PLANS[user!.plan];
  const hasPlan = user!.plan !== "none";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greet},</p>
          <h1 className="font-display text-3xl font-bold lg:text-4xl">{firstName}.</h1>
        </div>
        <Button onClick={onNew} className="hidden rounded-2xl bg-gold font-semibold text-black hover:opacity-90 lg:inline-flex">
          <Plus className="mr-2 h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-black p-6 ring-1 ring-gold/20 lg:col-span-2">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
              <Sparkles className="h-3.5 w-3.5" /> Seu plano
            </div>
            <div className="mt-3 font-display text-2xl font-bold lg:text-3xl">{hasPlan ? plan.name : "Sem assinatura"}</div>
            <div className="mt-1 text-sm text-muted-foreground">{hasPlan ? "Acesso aos serviços inclusos sem custo." : "Você está agendando no avulso. Assine e economize."}</div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-3xl font-bold text-gold">{hasPlan ? `R$ ${plan.price.toFixed(2).replace(".", ",")}` : "R$ 0,00"}</span>
              <span className="text-sm text-muted-foreground">{hasPlan ? "/mês" : "/mês"}</span>
            </div>
            <Button onClick={onPlan} variant="outline" className="mt-5 rounded-2xl border-border bg-card hover:bg-secondary">
              {hasPlan ? "Gerenciar plano" : "Conhecer planos"}
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Próxima visita</div>
          {future[0] ? (
            <>
              <div className="mt-2 font-display text-2xl font-bold">{format(parseISO(future[0].date), "dd 'de' MMM", { locale: ptBR })}</div>
              <div className="text-sm text-muted-foreground">{future[0].time} · {future[0].service}</div>
              <div className="mt-1 text-xs text-muted-foreground">com {future[0].barber}</div>
            </>
          ) : (
            <>
              <div className="mt-2 font-display text-xl font-bold">Sem visitas</div>
              <Button onClick={onNew} className="mt-3 w-full rounded-2xl bg-gold text-black hover:opacity-90">Agendar</Button>
            </>
          )}
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximos agendamentos</h2>
          <button onClick={onSeeAll} className="text-xs text-gold">Ver todos</button>
        </div>
        {future.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center">
            <CalendarClock className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum agendamento por aqui.</p>
            <Button onClick={onNew} className="mt-4 rounded-2xl bg-gold text-black hover:opacity-90">Agendar agora</Button>
          </div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {future.slice(0, 4).map(a => <ApptCard key={a.id} a={a} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ApptCard({ a, showCancel = true }: { a: Appointment; showCancel?: boolean }) {
  const { cancelAppointment } = useApp();
  const d = parseISO(a.date);
  const upcoming = !isPast(parseISO(`${a.date}T${a.time}`));
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
        <div className="text-center leading-none">
          <div className="text-[10px] uppercase">{format(d, "MMM", { locale: ptBR })}</div>
          <div className="font-display text-xl font-bold">{format(d, "dd")}</div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{a.service} · {a.time}</div>
        <div className="truncate text-xs text-muted-foreground">com {a.barber}</div>
        <div className="mt-0.5 text-xs font-semibold text-gold">{fmtBRL(a.price)}</div>
      </div>
      {upcoming && showCancel ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive" aria-label="Cancelar">
              <X className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-3xl bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Cancelar agendamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a cancelar {a.service} com {a.barber} em {format(d, "dd/MM")} às {a.time}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl">Manter</AlertDialogCancel>
              <AlertDialogAction onClick={() => { cancelAppointment(a.id); toast.success("Agendamento cancelado"); }} className="rounded-2xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Cancelar agendamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Concluído</span>
      )}
    </div>
  );
}

function AppointmentsView({ onNew }: { onNew: () => void }) {
  const { future, past } = useSplit();
  return (
    <div>
      <div className="mb-4 hidden justify-end lg:flex">
        <Button onClick={onNew} className="rounded-2xl bg-gold font-semibold text-black hover:opacity-90"><Plus className="mr-2 h-4 w-4" /> Novo</Button>
      </div>
      <Tabs defaultValue="future">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-card p-1">
          <TabsTrigger value="future" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black">Agendados ({future.length})</TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl data-[state=active]:bg-gold data-[state=active]:text-black">Anteriores ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="future" className="mt-5 grid gap-2 lg:grid-cols-2">
          {future.length === 0 ? (
            <div className="lg:col-span-2"><Empty msg="Sem agendamentos futuros." action={<Button onClick={onNew} className="rounded-2xl bg-gold text-black hover:opacity-90">Agendar</Button>} /></div>
          ) : future.map(a => <ApptCard key={a.id} a={a} />)}
        </TabsContent>
        <TabsContent value="past" className="mt-5 grid gap-2 lg:grid-cols-2">
          {past.length === 0 ? <div className="lg:col-span-2"><Empty msg="Você ainda não fez visitas." /></div> : past.map(a => <ApptCard key={a.id} a={a} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ msg, action }: { msg: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
      <CalendarClock className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{msg}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ClubView() {
  const perks = [
    "Cortes ilimitados todo mês", "Barba quinzenal inclusa", "Atendimento prioritário",
    "Drink cortesia em cada visita", "Kit de produtos premium trimestral", "Desconto em produtos da loja",
  ];
  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-gold via-amber-300 to-amber-500 p-6 text-black lg:p-10">
        <div className="text-xs font-bold uppercase tracking-[0.3em]">Clube Navalha</div>
        <div className="mt-2 font-display text-3xl font-bold lg:text-4xl">Membro Gold</div>
        <div className="mt-4 max-w-md text-sm opacity-80">Benefícios exclusivos para quem cuida do estilo todos os dias.</div>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        {perks.map(p => (
          <div key={p} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gold/15"><Check className="h-4 w-4 text-gold" /></div>
            <span className="text-sm">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanView() {
  const { user, setPlan } = useApp();
  const current = user!.plan;
  const plans: { id: PlanId; perks: string[]; featured?: boolean }[] = [
    { id: "essencial", perks: ["2 cortes/mês", "Sem barba inclusa"] },
    { id: "ilimitado", perks: ["Cortes ilimitados", "Barba quinzenal", "Combo grátis"], featured: true },
    { id: "premium",   perks: ["Tudo do Ilimitado", "Kit trimestral", "Prioridade total"] },
  ];

  function pick(id: PlanId) {
    if (id === current) {
      setPlan("none");
      toast.success("Plano cancelado. Agora você agenda no avulso.");
    } else {
      setPlan(id);
      toast.success(`Plano ${PLANS[id].name} ativado!`);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Escolha o plano que combina com sua rotina, ou continue no avulso pagando por agendamento.</p>

      <div className={`rounded-3xl border p-5 ${current === "none" ? "border-gold ring-2 ring-gold/30" : "border-border"} bg-card`}>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl font-bold">Avulso</h3>
          {current === "none" && <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase text-black">Atual</span>}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">Sem mensalidade. Pague apenas o serviço escolhido.</div>
        <div className="mt-2 text-2xl font-bold text-gold">R$ 0,00<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
        {current !== "none" && (
          <Button onClick={() => pick(current)} variant="outline" className="mt-4 h-11 w-full rounded-2xl border-border hover:bg-secondary">Voltar para avulso</Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map(p => {
          const meta = PLANS[p.id];
          const isCurrent = current === p.id;
          return (
            <div key={p.id} className={`rounded-3xl border p-5 ${isCurrent || p.featured ? "border-gold ring-2 ring-gold/30" : "border-border"} bg-card`}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-xl font-bold">{meta.name}</h3>
                {isCurrent ? <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase text-black">Atual</span>
                  : p.featured && <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-gold">Popular</span>}
              </div>
              <div className="mt-1 text-2xl font-bold text-gold">R$ {meta.price.toFixed(2).replace(".", ",")}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {p.perks.map(x => <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-gold" /> {x}</li>)}
              </ul>
              <Button onClick={() => pick(p.id)} className={`mt-4 h-11 w-full rounded-2xl ${isCurrent ? "bg-secondary text-foreground hover:bg-secondary/70" : "bg-gold text-black hover:opacity-90"}`}>
                {isCurrent ? "Cancelar plano" : "Assinar"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView() {
  const { user, updateProfile, logout, isAdmin } = useApp();
  const [f, setF] = useState({ ...user! });

  function save(e: React.FormEvent) {
    e.preventDefault();
    updateProfile(f);
    toast.success("Dados atualizados");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gold text-2xl font-bold text-black">
            {user!.name.split(" ").map(p => p[0]).slice(0,2).join("").toUpperCase()}
          </div>
          <div className="text-center">
            <div className="font-display text-xl font-bold">{user!.name}</div>
            <div className="text-xs text-muted-foreground">{user!.email}</div>
            <div className="mt-2 inline-block rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
              Plano {PLANS[user!.plan].name}
            </div>
            {isAdmin && (
              <div className="mt-2 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Administrador
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {isAdmin && (
            <a href="/admin" className="flex w-full items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4 text-left hover:bg-gold/10">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold/20"><Shield className="h-5 w-5 text-gold" /></div>
              <div className="flex-1">
                <div className="font-semibold">Painel administrativo</div>
                <div className="text-xs text-muted-foreground">Agenda, barbeiros, serviços e relatórios</div>
              </div>
            </a>
          )}
          <button className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left hover:bg-secondary">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary"><Shield className="h-5 w-5 text-gold" /></div>
            <div className="flex-1">
              <div className="font-semibold">Segurança da conta</div>
              <div className="text-xs text-muted-foreground">Senha, dispositivos e privacidade</div>
            </div>
          </button>
          <button className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left hover:bg-secondary">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary"><CalIcon className="h-5 w-5 text-gold" /></div>
            <div className="flex-1">
              <div className="font-semibold">Google Agenda</div>
              <div className="text-xs text-muted-foreground">Sincronize seus agendamentos</div>
            </div>
          </button>
          <button onClick={logout} className="mt-4 w-full rounded-2xl border border-destructive/40 bg-transparent p-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
            Sair da conta
          </button>
        </div>
      </div>


      <form onSubmit={save} className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Dados pessoais</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="Nome"><Input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Row>
          <Row label="Telefone"><Input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Row>
          <Row label="CPF"><Input value={f.cpf} onChange={e => setF({ ...f, cpf: e.target.value })} placeholder="000.000.000-00" /></Row>
          <Row label="Nascimento"><Input type="date" value={f.birthdate} onChange={e => setF({ ...f, birthdate: e.target.value })} /></Row>
        </div>
        <h3 className="pt-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Endereço</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row label="CEP"><Input value={f.cep} onChange={e => setF({ ...f, cep: e.target.value })} placeholder="00000-000" /></Row>
          <Row label="Rua"><Input value={f.street} onChange={e => setF({ ...f, street: e.target.value })} /></Row>
          <Row label="Número"><Input value={f.number} onChange={e => setF({ ...f, number: e.target.value })} /></Row>
          <Row label="Bairro"><Input value={f.district} onChange={e => setF({ ...f, district: e.target.value })} /></Row>
          <Row label="Cidade"><Input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} /></Row>
          <Row label="Estado"><Input value={f.state} onChange={e => setF({ ...f, state: e.target.value })} /></Row>
        </div>
        <Button type="submit" className="h-12 w-full rounded-2xl bg-gold font-semibold text-black hover:opacity-90 sm:w-auto sm:px-8">Salvar alterações</Button>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

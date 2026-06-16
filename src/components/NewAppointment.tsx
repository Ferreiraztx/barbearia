import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useApp, priceFor, PLANS, type BarberRow, type ServiceRow } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, Check, ChevronLeft, BadgeCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TIMES = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function fmtBRL(n: number) {
  return n === 0 ? "Grátis" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NewAppointment({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addAppointment, user } = useApp();
  const plan = user?.plan ?? "none";

  const [step, setStep] = useState(1);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [service, setService] = useState<ServiceRow | null>(null);
  const [barber, setBarber] = useState<BarberRow | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from("services").select("*").eq("active", true).then(({ data }) => {
      setServices((data ?? []).map((s: any) => ({ ...s, price: Number(s.price) })));
    });
    supabase.from("barbers").select("*").eq("active", true).then(({ data }) => {
      setBarbers(data ?? []);
    });
  }, [open]);

  // Buscar horários já reservados ao trocar barbeiro/data
  useEffect(() => {
    if (!barber || !date) { setBooked(new Set()); return; }
    setLoadingSlots(true);
    const dateStr = format(date, "yyyy-MM-dd");
    supabase.rpc("get_booked_slots", { _barber_id: barber.id, _date: dateStr })
      .then(({ data }) => {
        const slots = (data ?? []).map((r: any) => (typeof r.time === "string" ? r.time.slice(0, 5) : r.time));
        setBooked(new Set(slots));
      })
      .then(() => setLoadingSlots(false));
  }, [barber, date]);

  function reset() {
    setStep(1); setService(null); setBarber(null); setDate(undefined); setTime(null); setBooked(new Set());
  }

  async function confirm() {
    if (!service || !barber || !date || !time) return;
    setSubmitting(true);
    const price = priceFor(service.name, service.price, plan);
    const ok = await addAppointment({
      service_id: service.id,
      service: service.name,
      barber_id: barber.id,
      barber: barber.name,
      date: format(date, "yyyy-MM-dd"),
      time,
      price,
    });
    setSubmitting(false);
    if (!ok) { toast.error("Esse horário já foi reservado. Escolha outro."); return; }
    toast.success(price === 0 ? "Agendado pelo seu plano!" : `Agendado · ${fmtBRL(price)}`);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl bg-card sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-2 space-y-0">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="rounded-full p-1 hover:bg-secondary">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <DialogTitle className="font-display text-xl">Novo agendamento · Passo {step}/3</DialogTitle>
        </DialogHeader>

        {plan !== "none" && (
          <div className="flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold">
            <BadgeCheck className="h-4 w-4" />
            Plano <strong className="font-semibold">{PLANS[plan].name}</strong> ativo — serviços inclusos saem grátis.
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Escolha o serviço</p>
            {services.length === 0 && <div className="rounded-2xl border border-border bg-background p-6 text-center text-sm text-muted-foreground">Carregando…</div>}
            {services.map(s => {
              const covered = PLANS[plan].covers.includes(s.name);
              const price = priceFor(s.name, s.price, plan);
              return (
                <button key={s.id} onClick={() => setService(s)}
                  className={cn("flex w-full items-center justify-between rounded-2xl border bg-background p-4 text-left transition",
                    service?.id === s.id ? "border-gold ring-2 ring-gold/40" : "border-border hover:border-muted-foreground")}>
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary"><Scissors className="h-5 w-5 text-gold" /></div>
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {covered && <div className="text-[10px] text-muted-foreground line-through">{fmtBRL(s.price)}</div>}
                    <div className={cn("text-sm font-semibold", covered ? "text-emerald-400" : "text-gold")}>{fmtBRL(price)}</div>
                  </div>
                </button>
              );
            })}
            <Button disabled={!service} onClick={() => setStep(2)} className="mt-2 h-12 w-full rounded-2xl bg-gold font-semibold text-black hover:opacity-90">Continuar</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Escolha o barbeiro</p>
            {barbers.map(b => (
              <button key={b.id} onClick={() => setBarber(b)}
                className={cn("flex w-full items-center gap-3 rounded-2xl border bg-background p-4 text-left transition",
                  barber?.id === b.id ? "border-gold ring-2 ring-gold/40" : "border-border hover:border-muted-foreground")}>
                <div className="grid h-11 w-11 place-items-center rounded-full bg-gold/20 font-semibold text-gold">{b.name.split(" ").map(x => x[0]).join("").slice(0, 2)}</div>
                <div className="flex-1">
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted-foreground">Especialista</div>
                </div>
                {barber?.id === b.id && <Check className="h-5 w-5 text-gold" />}
              </button>
            ))}
            <Button disabled={!barber} onClick={() => setStep(3)} className="mt-2 h-12 w-full rounded-2xl bg-gold font-semibold text-black hover:opacity-90">Continuar</Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Escolha a data</p>
              <div className="flex justify-center rounded-2xl border border-border bg-background p-2">
                <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR}
                  disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                  className="pointer-events-auto" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Horário disponível</p>
                {loadingSlots && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {TIMES.map(t => {
                  const isBooked = booked.has(t) || booked.has(`${t}:00`);
                  return (
                    <button key={t} disabled={isBooked} onClick={() => setTime(t)}
                      className={cn("rounded-xl border py-2.5 text-sm font-medium transition",
                        isBooked
                          ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground line-through opacity-50"
                          : time === t
                            ? "border-gold bg-gold text-black"
                            : "border-border bg-background hover:border-muted-foreground")}>
                      {t}
                    </button>
                  );
                })}
              </div>
              {date && booked.size > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">{booked.size} horário(s) já reservado(s) para este barbeiro.</p>
              )}
            </div>
            {service && (
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div className="text-sm text-muted-foreground">Total a pagar</div>
                <div className="font-display text-2xl font-bold text-gold">{fmtBRL(priceFor(service.name, service.price, plan))}</div>
              </div>
            )}
            <Button disabled={!date || !time || submitting} onClick={confirm} className="h-12 w-full rounded-2xl bg-gold font-semibold text-black hover:opacity-90">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar agendamento"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

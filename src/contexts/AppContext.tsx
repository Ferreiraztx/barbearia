import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type PlanId = "none" | "essencial" | "ilimitado" | "premium";

// Catálogo de planos (mantido em código — preços de plano não estão no banco ainda)
export const PLANS: Record<PlanId, { name: string; price: number; covers: string[] }> = {
  none:       { name: "Avulso",    price: 0,     covers: [] },
  essencial:  { name: "Essencial", price: 49.9,  covers: ["Corte"] },
  ilimitado:  { name: "Ilimitado", price: 79.9,  covers: ["Corte", "Barba", "Combo"] },
  premium:    { name: "Premium",   price: 129.9, covers: ["Corte", "Barba", "Combo"] },
};

export type ServiceRow = { id: string; name: string; description: string; price: number; active: boolean };
export type BarberRow = { id: string; name: string; avatar_url: string | null; active: boolean };

export function priceFor(serviceName: string, basePrice: number, plan: PlanId): number {
  return PLANS[plan].covers.includes(serviceName) ? 0 : basePrice;
}

export type Appointment = {
  id: string;
  user_id: string;
  barber_id: string;
  barber: string;        // alias de barber_name (UI)
  service: string;       // alias de service_name (UI)
  service_id: string | null;
  date: string;
  time: string;          // HH:mm
  price: number;
  status: "confirmed" | "completed" | "cancelled";
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthdate: string;
  cpf: string;
  cep: string;
  street: string;
  number: string;
  city: string;
  district: string;
  state: string;
  plan: PlanId;
};

type AppState = {
  user: Profile | null;
  appointments: Appointment[];
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { name: string; email: string; phone: string; birthdate: string; password: string }) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  addAppointment: (a: { barber_id: string; barber: string; service_id: string | null; service: string; date: string; time: string; price: number }) => Promise<boolean>;
  cancelAppointment: (id: string) => Promise<void>;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
  setPlan: (plan: PlanId) => Promise<void>;
  bootstrapAdmin: () => Promise<boolean>;
  refreshAdmin: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

function rowToAppt(r: any): Appointment {
  return {
    id: r.id,
    user_id: r.user_id,
    barber_id: r.barber_id,
    barber: r.barber_name,
    service: r.service_name,
    service_id: r.service_id,
    date: r.date,
    time: typeof r.time === "string" ? r.time.slice(0, 5) : r.time,
    price: Number(r.price),
    status: r.status,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = useCallback(async () => {
    const { data } = await supabase.rpc("is_current_user_admin");
    setIsAdmin(Boolean(data));
  }, []);

  const loadUserData = useCallback(async (uid: string) => {
    const [{ data: profile }, { data: appts }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("appointments").select("*").eq("user_id", uid).order("date", { ascending: true }),
    ]);
    if (profile) {
      setUser({
        id: profile.id,
        name: profile.name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        birthdate: profile.birthdate ?? "",
        cpf: profile.cpf ?? "",
        cep: profile.cep ?? "",
        street: profile.street ?? "",
        number: profile.number ?? "",
        city: profile.city ?? "",
        district: profile.district ?? "",
        state: profile.state ?? "",
        plan: (profile.plan ?? "none") as PlanId,
      });
    }
    setAppointments((appts ?? []).map(rowToAppt));
    await checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { loadUserData(s.user.id); }, 0);
      } else {
        setUser(null);
        setAppointments([]);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) loadUserData(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const value: AppState = {
    user,
    appointments,
    loading,
    isAdmin,
    login: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    },
    signup: async (data) => {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
          data: { name: data.name, phone: data.phone, birthdate: data.birthdate },
        },
      });
      return !error;
    },
    loginWithGoogle: async () => {
      const { lovable } = await import("@/integrations/lovable/index");
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
    },
    logout: async () => { await supabase.auth.signOut(); },
    addAppointment: async (a) => {
      if (!session?.user) return false;
      const { data, error } = await supabase.from("appointments").insert({
        user_id: session.user.id,
        barber_id: a.barber_id,
        barber_name: a.barber,
        service_id: a.service_id,
        service_name: a.service,
        date: a.date,
        time: a.time,
        price: a.price,
        status: "confirmed",
      }).select().single();
      if (error || !data) return false;
      setAppointments(prev => [...prev, rowToAppt(data)]);
      return true;
    },
    cancelAppointment: async (id) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (!error) setAppointments(prev => prev.filter(a => a.id !== id));
    },
    updateProfile: async (p) => {
      if (!user) return;
      const { id: _id, email: _email, ...patch } = p;
      const { error } = await supabase.from("profiles").update(patch as never).eq("id", user.id);
      if (!error) setUser({ ...user, ...p });
    },
    setPlan: async (plan) => {
      if (!user) return;
      const { error } = await supabase.from("profiles").update({ plan }).eq("id", user.id);
      if (!error) setUser({ ...user, plan });
    },
    bootstrapAdmin: async () => {
      const { data, error } = await supabase.rpc("bootstrap_first_admin");
      if (error) return false;
      if (data) await checkAdmin();
      return Boolean(data);
    },
    refreshAdmin: checkAdmin,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Calendar, Home, LogOut, Scissors, Sparkles, User, CreditCard } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import type { View } from "./AppShell";

const items: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "home", label: "Início", icon: Home },
  { id: "appointments", label: "Agendamentos", icon: Calendar },
  { id: "club", label: "Clube", icon: Sparkles },
  { id: "plan", label: "Plano", icon: CreditCard },
  { id: "profile", label: "Perfil", icon: User },
];

export function Sidebar({ open, onOpenChange, view, setView }: {
  open: boolean; onOpenChange: (v: boolean) => void; view: View; setView: (v: View) => void;
}) {
  const { logout, user } = useApp();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[82%] max-w-xs border-border bg-sidebar p-0 text-sidebar-foreground">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-6 py-7 border-b border-sidebar-border">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-gold text-black">
              <Scissors className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg leading-tight">Navalha & Co.</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {items.map(({ id, label, icon: Icon }) => {
              const active = view === id;
              return (
                <button
                  key={id}
                  onClick={() => { setView(id); onOpenChange(false); }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                    active ? "bg-gold text-black" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <Icon className="h-5 w-5" /> {label}
                </button>
              );
            })}
          </nav>
          <div className="p-3 border-t border-sidebar-border">
            <button
              onClick={() => { logout(); onOpenChange(false); }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-sidebar-accent"
            >
              <LogOut className="h-5 w-5" /> Sair
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

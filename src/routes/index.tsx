import { createFileRoute } from "@tanstack/react-router";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { Onboarding } from "@/components/Onboarding";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Navalha & Co — Barbearia Premium" },
      { name: "description", content: "Agende cortes, gerencie sua assinatura e cuide do seu estilo na Navalha & Co." },
      { property: "og:title", content: "Navalha & Co — Barbearia Premium" },
      { property: "og:description", content: "Agende cortes, gerencie sua assinatura e cuide do seu estilo na Navalha & Co." },
    ],
  }),
  component: Index,
});

function Gate() {
  const { user } = useApp();
  return user ? <AppShell /> : <Onboarding />;
}

function Index() {
  return (
    <AppProvider>
      <Gate />
      <Toaster theme="dark" position="top-center" />
    </AppProvider>
  );
}

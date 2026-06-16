import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AppProvider } from "@/contexts/AppContext";
import { AdminPanel } from "@/components/AdminPanel";
import { Toaster } from "@/components/ui/sonner";

const searchSchema = z.object({
  setup: z.string().optional(),
});

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin · Navalha & Co." }],
  }),
  validateSearch: searchSchema,
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AppProvider>
      <AdminPanel />
      <Toaster theme="dark" position="top-center" />
    </AppProvider>
  );
}

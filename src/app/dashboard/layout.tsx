import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { PermissoesProvider } from "@/contexts/permissoes-context";
import { getPermissoesEfetivas } from "@/lib/permissoes";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const permissoes = getPermissoesEfetivas(session.perfilAcesso, session.permissoes);

  return (
    <PermissoesProvider permissoes={permissoes}>
      <DashboardShell usuario={session} permissoes={permissoes}>
        {children}
      </DashboardShell>
    </PermissoesProvider>
  );
}

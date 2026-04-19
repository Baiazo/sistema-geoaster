import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
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
      <div className="flex min-h-screen bg-background">
        <Sidebar usuario={session} permissoes={permissoes} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </PermissoesProvider>
  );
}

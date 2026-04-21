import { getSession } from "@/lib/auth";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await getSession();
  const nomeUsuario = session?.nome?.split(" ")[0] ?? "Usuário";
  const isAdmin = session?.perfilAcesso === "ADMIN";
  return <DashboardClient nomeUsuario={nomeUsuario} isAdmin={isAdmin} />;
}

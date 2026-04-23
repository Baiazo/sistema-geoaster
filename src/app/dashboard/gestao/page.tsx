import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  Users, UsersRound, ShieldAlert, BarChart2,
  MapPin, Leaf, Building2,
} from "lucide-react";

const modulos = [
  {
    href: "/dashboard/colaboradores",
    label: "Colaboradores",
    descricao: "Gerenciar colaboradores e cargos",
    icon: Users,
    cor: "bg-slate-500",
  },
  {
    href: "/dashboard/equipes",
    label: "Equipes",
    descricao: "Gerenciar equipes e responsáveis",
    icon: UsersRound,
    cor: "bg-slate-500",
  },
  {
    href: "/dashboard/admin/logs",
    label: "Auditoria",
    descricao: "Logs de auditoria do sistema",
    icon: ShieldAlert,
    cor: "bg-slate-500",
  },
  {
    href: "/dashboard/gestao/graficos?setor=GEO",
    label: "Gráficos — Geo",
    descricao: "Dashboard analítico do setor GEO",
    icon: MapPin,
    cor: "bg-sky-500",
  },
  {
    href: "/dashboard/gestao/graficos?setor=AMBIENTAL",
    label: "Gráficos — Ambiental",
    descricao: "Dashboard analítico do setor Ambiental",
    icon: Leaf,
    cor: "bg-emerald-500",
  },
  {
    href: "/dashboard/gestao/graficos?setor=IMOVEIS",
    label: "Gráficos — Imóveis",
    descricao: "Dashboard analítico do setor Imóveis",
    icon: Building2,
    cor: "bg-yellow-500",
  },
];

export default async function GestaoPage() {
  const session = await getSession();
  if (!session || session.perfilAcesso !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Gestão</h1>
        <p className="text-muted-foreground mt-1">
          Central administrativa do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {modulos.map((m) => {
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className="group bg-card rounded-lg border shadow-sm p-6 hover:shadow-md transition-all hover:border-sky-200"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${m.cor}`}>
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-sky-600 transition-colors">
                    {m.label}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {m.descricao}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const statusLabels: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-700",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  CONCLUIDO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
  APROVADO: "bg-emerald-100 text-emerald-700",
  REJEITADO: "bg-rose-100 text-rose-700",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

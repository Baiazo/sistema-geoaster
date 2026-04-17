const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || "http://localhost:3002";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function montarMensagemProtocolo({
  nomeCliente,
  nomeServico,
  status,
  protocolo,
}: {
  nomeCliente: string;
  nomeServico: string;
  status: string;
  protocolo: string;
}): string {
  const statusLabel = STATUS_LABELS[status] ?? status;
  const link = `${APP_URL}/protocolo?numero=${protocolo}`;

  return `Olá, ${nomeCliente}! 👋

Aqui é a equipe da Geoaster 🌱

Seu serviço de "${nomeServico}" teve uma atualização e agora está com o status: ${statusLabel}.

Se quiser acompanhar mais detalhes, é só acessar pelo link abaixo:

📄 Protocolo do serviço: ${protocolo}
🔗 Link de acompanhamento: ${link}

Qualquer dúvida, estamos por aqui! 🙂`;
}

export async function enviarWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

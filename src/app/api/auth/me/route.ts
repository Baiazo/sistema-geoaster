import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }
  return Response.json({ usuario: session });
}

export async function POST() {
  const response = Response.json({ ok: true });
  response.headers.set(
    "Set-Cookie",
    "geoaster_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  return response;
}

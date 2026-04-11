const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const { _liToken } = await req.json();
    const token = Netlify.env.get("LINKEDIN_ACCESS_TOKEN") || _liToken;
    if (!token) return new Response(JSON.stringify({ error: "Token não configurado" }), { status: 400, headers: CORS });

    const res = await fetch("https://api.linkedin.com/v2/me", {
      headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" },
    });

    const data = await res.json();

    if (!res.ok) return new Response(JSON.stringify({ error: data.message || "Erro ao buscar perfil", raw: data }), { status: res.status, headers: CORS });

    const id  = data.id;
    const urn = `urn:li:person:${id}`;
    const nome = `${data.localizedFirstName || ""} ${data.localizedLastName || ""}`.trim();

    return new Response(JSON.stringify({ success: true, id, urn, nome }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
};

export const config = { path: "/api/linkedin-me" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const body = await req.json();
    // Aceita chave do env var OU do body (enviada pelo frontend via localStorage)
    const key = Netlify.env.get("ANTHROPIC_API_KEY") || body._apiKey;
    if (!key) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY não configurada. Vá em Config e salve sua chave." }), { status: 500, headers: CORS });
    // Remove _apiKey do body antes de enviar para Anthropic
    const { _apiKey, ...cleanBody } = body;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(cleanBody),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: res.status, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
};

export const config = { path: "/api/claude" };

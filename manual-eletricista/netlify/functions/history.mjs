import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: "post-history", consistency: "strong" });

  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();
      const posts = await Promise.all(blobs.map(async (b) => {
        const data = await store.get(b.key, { type: "json" });
        return { id: b.key, ...data };
      }));
      const sorted = posts.sort((a, b) => new Date(b.publicadoEm) - new Date(a.publicadoEm));
      return new Response(JSON.stringify(sorted), { status: 200, headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { id } = await req.json();
      await store.delete(id);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }

  return new Response(JSON.stringify({ error: "Método não suportado" }), { status: 405, headers: CORS });
};

export const config = { path: "/api/history" };

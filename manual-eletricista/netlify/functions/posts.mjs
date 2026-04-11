import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const getPostsStore = () => getStore({ name: "scheduled-posts", consistency: "strong" });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const store = getPostsStore();

  // GET — lista todos os posts
  if (req.method === "GET") {
    try {
      const { blobs } = await store.list();
      const posts = await Promise.all(blobs.map(async (b) => {
        const data = await store.get(b.key, { type: "json" });
        return { id: b.key, ...data };
      }));
      const sorted = posts.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      return new Response(JSON.stringify(sorted), { status: 200, headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }

  // POST — cria ou atualiza post agendado
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const id = body.id || `post_${Date.now()}`;
      const post = {
        id,
        texto: body.texto,
        plataforma: body.plataforma, // "linkedin" | "facebook"
        scheduledAt: body.scheduledAt, // ISO string
        status: "pendente", // pendente | publicado | erro
        categoria: body.categoria || "geral",
        imagemUrl: body.imagemUrl || null,
        criadoEm: body.criadoEm || new Date().toISOString(),
      };
      await store.setJSON(id, post);
      return new Response(JSON.stringify({ success: true, post }), { status: 200, headers: CORS });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
    }
  }

  // DELETE — remove post
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

export const config = { path: "/api/posts" };

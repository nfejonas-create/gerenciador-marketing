import { getStore } from "@netlify/blobs";

// Roda a cada 15 minutos — verifica posts agendados e publica
export default async (req) => {
  const store = getStore({ name: "scheduled-posts", consistency: "strong" });
  const histStore = getStore({ name: "post-history", consistency: "strong" });

  try {
    const { blobs } = await store.list();
    const now = new Date();

    for (const blob of blobs) {
      const post = await store.get(blob.key, { type: "json" });
      if (!post || post.status !== "pendente") continue;

      const scheduledTime = new Date(post.scheduledAt);
      // Publica se já passou do horário agendado (dentro de 15min de janela)
      const diff = now - scheduledTime;
      if (diff < 0 || diff > 15 * 60 * 1000) continue;

      let result = { success: false, error: "Plataforma não suportada" };

      if (post.plataforma === "linkedin") {
        const token = Netlify.env.get("LINKEDIN_ACCESS_TOKEN");
        const urn   = Netlify.env.get("LINKEDIN_AUTHOR_URN");
        if (token && urn) {
          const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
            body: JSON.stringify({
              author: urn,
              lifecycleState: "PUBLISHED",
              specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: post.texto }, shareMediaCategory: "NONE" } },
              visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
            }),
          });
          result = { success: res.ok, status: res.status };
        } else {
          result = { success: false, error: "LinkedIn não configurado" };
        }
      }

      // Atualiza status do post
      const updatedPost = { ...post, status: result.success ? "publicado" : "erro", publicadoEm: now.toISOString(), erro: result.error };
      await store.setJSON(blob.key, updatedPost);

      // Salva no histórico
      const histId = `hist_${Date.now()}_${blob.key}`;
      await histStore.setJSON(histId, {
        ...updatedPost,
        histId,
        agendadoPara: post.scheduledAt,
        publicadoEm: now.toISOString(),
      });

      console.log(`[scheduler] Post ${blob.key} → ${result.success ? "✅ publicado" : "❌ erro"}`);
    }
  } catch (e) {
    console.error("[scheduler] Erro:", e.message);
  }
};

export const config = { schedule: "*/15 * * * *" };

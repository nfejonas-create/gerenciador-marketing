const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try {
    const { text, _liToken, _liUrn } = await req.json();
    const token = Netlify.env.get("LINKEDIN_ACCESS_TOKEN") || _liToken;
    const urn   = Netlify.env.get("LINKEDIN_AUTHOR_URN") || _liUrn;
    if (!token || !urn) return new Response(JSON.stringify({ error: "LinkedIn não configurado. Vá em Config e salve Token e URN." }), { status: 400, headers: CORS });
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify({
        author: urn,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify({ success: res.ok, status: res.status, data }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
};

export const config = { path: "/api/linkedin" };

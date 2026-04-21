// Serviço para publicar no LinkedIn diretamente do browser
// Isso evita o bloqueio de IP de datacenter do Render

interface LinkedInAccount {
  accessToken: string;
}

// Obter person ID via /v2/userinfo (funciona no browser)
export async function getLinkedInPersonId(accessToken: string): Promise<string> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  return data.sub; // sub do userinfo = ID correto
}

// Publicar post de TEXTO diretamente do browser
export async function publishTextPost(
  accessToken: string,
  text: string
): Promise<{ ok: boolean; postId: string }> {
  const personId = await getLinkedInPersonId(accessToken);
  const authorUrn = `urn:li:person:${personId}`;

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  const postId = res.headers.get('x-restli-id') || '';
  return { ok: res.status === 201, postId };
}

// Publicar carrossel (texto por enquanto)
export async function publishCarousel(
  accessToken: string,
  title: string,
  slides: any[]
): Promise<{ ok: boolean; postId: string }> {
  const firstSlide = slides[0];
  const text = `📊 ${title}\n\n${firstSlide?.body || ''}\n\n#carrossel`;
  return publishTextPost(accessToken, text);
}

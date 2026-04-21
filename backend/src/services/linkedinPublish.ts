import axios from 'axios';

interface LinkedInAccount {
  accessToken: string;
  personId?: string;
  pageId?: string;
}

// Obter person ID via /v2/userinfo (sub = ID correto)
export async function getLinkedInPersonId(accessToken: string): Promise<string> {
  const res = await axios.get('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.data.sub; // sub do userinfo = ID correto do person
}

// Publicar post de TEXTO via /v2/ugcPosts (funciona com w_member_social)
export async function publishTextPost(
  account: LinkedInAccount,
  text: string
): Promise<string> {
  // Obter person ID se não tiver
  if (!account.personId && !account.pageId) {
    account.personId = await getLinkedInPersonId(account.accessToken);
  }

  const authorUrn = account.pageId 
    ? `urn:li:organization:${account.pageId}`
    : `urn:li:person:${account.personId}`;

  console.log('[LinkedIn] Publicando post de texto...');
  console.log('[LinkedIn] Author:', authorUrn);

  const postRes = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE', // texto simples
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
    }
  );

  const postId = postRes.headers['x-restli-id'] || '';
  console.log('[LinkedIn] Post criado! ID:', postId);
  
  return postId;
}

// Publicar post com IMAGEM via /v2/ugcPosts + Assets API
export async function publishImagePost(
  account: LinkedInAccount,
  imageBuffer: Buffer,
  text: string
): Promise<string> {
  if (!account.personId && !account.pageId) {
    account.personId = await getLinkedInPersonId(account.accessToken);
  }

  const authorUrn = account.pageId 
    ? `urn:li:organization:${account.pageId}`
    : `urn:li:person:${account.personId}`;

  console.log('[LinkedIn] Registrando upload de imagem...');

  // 1. Registrar upload via Assets API
  const registerRes = await axios.post(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: authorUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
    }
  );

  const assetUrn = registerRes.data.value.asset;
  const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;

  console.log('[LinkedIn] Asset URN:', assetUrn);

  // 2. Upload da imagem
  await axios.put(uploadUrl, imageBuffer, {
    headers: { 'Content-Type': 'application/octet-stream' },
    maxBodyLength: Infinity,
  });

  console.log('[LinkedIn] Upload concluído');

  // 3. Criar post com imagem
  const postRes = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'IMAGE',
          media: [{ status: 'READY', media: assetUrn }],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
    }
  );

  const postId = postRes.headers['x-restli-id'] || '';
  console.log('[LinkedIn] Post com imagem criado! ID:', postId);
  
  return postId;
}

// Fluxo completo: publicar carrossel (texto por enquanto)
export async function publishCarouselToLinkedIn(
  account: LinkedInAccount,
  slides: any[],
  commentary: string
): Promise<{ postUrn: string }> {
  const postUrn = await publishTextPost(account, commentary);
  return { postUrn };
}

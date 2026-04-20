import axios from 'axios';
import FormData from 'form-data';

interface LinkedInAccount {
  accessToken: string;
  pageId?: string;
}

// Upload de imagem para LinkedIn
async function uploadImageToLinkedIn(
  account: LinkedInAccount,
  imageBuffer: Buffer
): Promise<string> {
  // Registrar upload
  const registerRes = await axios.post(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: account.pageId ? `urn:li:organization:${account.pageId}` : 'urn:li:person',
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = registerRes.data.value.asset;

  // Upload da imagem
  await axios.put(uploadUrl, imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
    },
  });

  return assetUrn;
}

// Criar post com múltiplas imagens (carrossel)
export async function createLinkedInCarouselPost(
  account: LinkedInAccount,
  imageBuffers: Buffer[],
  text: string,
  title: string
): Promise<string> {
  const author = account.pageId 
    ? `urn:li:organization:${account.pageId}` 
    : 'urn:li:person';

  // Fazer upload de todas as imagens
  const imageUrns: string[] = [];
  for (const buffer of imageBuffers) {
    const urn = await uploadImageToLinkedIn(account, buffer);
    imageUrns.push(urn);
  }

  // Criar post com múltiplas imagens
  const media = imageUrns.map((urn, index) => ({
    status: 'READY',
    description: {
      text: index === 0 ? title : `Slide ${index + 1}`,
    },
    media: urn,
    title: {
      text: index === 0 ? title : `Slide ${index + 1}`,
    },
  }));

  const postRes = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory: 'IMAGE',
          media,
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );

  return postRes.headers['x-restli-id'] || postRes.data.id;
}

// Manter função de documento PDF para fallback
export async function uploadDocumentToLinkedIn(
  account: LinkedInAccount,
  pdfBuffer: Buffer,
  title: string
): Promise<string> {
  const registerRes = await axios.post(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-document'],
        owner: account.pageId ? `urn:li:organization:${account.pageId}` : 'urn:li:person',
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const uploadUrl = registerRes.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = registerRes.data.value.asset;

  await axios.put(uploadUrl, pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
    },
  });

  return assetUrn;
}

export async function createLinkedInDocumentPost(
  account: LinkedInAccount,
  assetUrn: string,
  text: string,
  title: string
): Promise<string> {
  const author = account.pageId 
    ? `urn:li:organization:${account.pageId}` 
    : 'urn:li:person';

  const postRes = await axios.post(
    'https://api.linkedin.com/v2/ugcPosts',
    {
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory: 'DOCUMENT',
          media: [{
            status: 'READY',
            description: {
              text: title,
            },
            media: assetUrn,
            title: {
              text: title,
            },
          }],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    }
  );

  return postRes.headers['x-restli-id'] || postRes.data.id;
}

import axios from 'axios';

interface LinkedInAccount {
  accessToken: string;
  pageId?: string;
}

export async function uploadDocumentToLinkedIn(
  account: LinkedInAccount,
  pdfBuffer: Buffer,
  title: string
): Promise<string> {
  // Passo 1: Registrar upload
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

  // Passo 2: Fazer upload do PDF
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

import axios from 'axios';

interface LinkedInAccount {
  accessToken: string;
  personId?: string;
  pageId?: string;
}

const LINKEDIN_VERSION = '202504';

// Obter person ID correto via /v2/me (não /v2/userinfo)
export async function getLinkedInPersonId(accessToken: string): Promise<string> {
  console.log('[LinkedIn] Buscando person ID via /v2/me...');
  
  const res = await axios.get('https://api.linkedin.com/v2/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Linkedin-Version': LINKEDIN_VERSION,
    },
  });
  
  const personId = res.data.id;
  console.log('[LinkedIn] Person ID correto:', personId);
  
  return personId;
}

// Etapa 1: Registrar upload do documento via Documents API
export async function registerDocumentUpload(
  account: LinkedInAccount
): Promise<{ uploadUrl: string; documentUrn: string }> {
  const owner = account.pageId 
    ? `urn:li:organization:${account.pageId}`
    : `urn:li:person:${account.personId}`;

  console.log('[LinkedIn] Registrando upload de documento...');
  console.log('[LinkedIn] Owner:', owner);

  const baseHeaders = {
    Authorization: `Bearer ${account.accessToken}`,
    'Linkedin-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  try {
    // BUG 1 CORRIGIDO: endpoint correto com ?action=initializeUpload
    const registerRes = await axios.post(
      'https://api.linkedin.com/rest/documents?action=initializeUpload',
      {
        initializeUploadRequest: {
          owner,
        },
      },
      { headers: baseHeaders }
    );

    const uploadUrl = registerRes.data.value.uploadUrl;
    const documentUrn = registerRes.data.value.document;

    console.log('[LinkedIn] Document URN:', documentUrn);
    console.log('[LinkedIn] Upload URL obtida');

    return { uploadUrl, documentUrn };
  } catch (err: any) {
    console.error('[LinkedIn] Erro ao registrar upload:', err.response?.data || err.message);
    throw err;
  }
}

// Etapa 2: Fazer upload do PDF
export async function uploadDocument(
  uploadUrl: string,
  pdfBuffer: Buffer
): Promise<void> {
  console.log('[LinkedIn] Fazendo upload do PDF...');
  
  await axios.put(uploadUrl, pdfBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    maxBodyLength: Infinity,
  });
  
  console.log('[LinkedIn] Upload concluído!');
}

// Etapa 3: Poll até documento ficar AVAILABLE
export async function waitForDocumentAvailable(
  account: LinkedInAccount,
  documentUrn: string
): Promise<void> {
  const baseHeaders = {
    Authorization: `Bearer ${account.accessToken}`,
    'Linkedin-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
  };

  const encodedUrn = encodeURIComponent(documentUrn);
  let status = '';
  let attempts = 0;
  const maxAttempts = 10;

  console.log('[LinkedIn] Aguardando documento ficar AVAILABLE...');

  while (status !== 'AVAILABLE' && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 3000)); // aguarda 3s
    
    const statusRes = await axios.get(
      `https://api.linkedin.com/rest/documents/${encodedUrn}`,
      { headers: baseHeaders }
    );
    
    status = statusRes.data.status;
    attempts++;
    console.log(`[LinkedIn] [${attempts}/${maxAttempts}] Document status: ${status}`);
  }

  if (status !== 'AVAILABLE') {
    throw new Error('Timeout: documento não ficou disponível após processamento');
  }

  console.log('[LinkedIn] Documento pronto!');
}

// Etapa 4: Criar post via Posts API
export async function createLinkedInPost(
  account: LinkedInAccount,
  documentUrn: string,
  commentary: string,
  title: string
): Promise<string> {
  const author = account.pageId 
    ? `urn:li:organization:${account.pageId}`
    : `urn:li:person:${account.personId}`;

  console.log('[LinkedIn] Criando post via Posts API...');
  console.log('[LinkedIn] Author:', author);
  console.log('[LinkedIn] Document:', documentUrn);
  console.log('[LinkedIn] Commentary:', commentary.substring(0, 50) + '...');

  const baseHeaders = {
    Authorization: `Bearer ${account.accessToken}`,
    'Linkedin-Version': LINKEDIN_VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  };

  console.log('[LinkedIn] Headers:', JSON.stringify(baseHeaders, null, 2));

  try {
    const postRes = await axios.post(
      'https://api.linkedin.com/rest/posts',
      {
        author,
        commentary,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        content: {
          media: {
            title,
            id: documentUrn,
          },
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      },
      { headers: baseHeaders }
    );

    console.log('[LinkedIn] Post response status:', postRes.status);
    console.log('[LinkedIn] Post response headers:', JSON.stringify(postRes.headers, null, 2));
    console.log('[LinkedIn] Post response data:', JSON.stringify(postRes.data, null, 2));

    const postId = postRes.headers['x-restli-id'] || postRes.headers['x-linkedin-id'] || '';
    console.log('[LinkedIn] Post ID extraído:', postId);

    return postId;
  } catch (err: any) {
    console.error('[LinkedIn] ERRO ao criar post:', err.response?.status, err.response?.statusText);
    console.error('[LinkedIn] ERRO data:', JSON.stringify(err.response?.data, null, 2));
    console.error('[LinkedIn] ERRO headers:', JSON.stringify(err.response?.headers, null, 2));
    throw err;
  }
}

// Fluxo completo: publicar carrossel
export async function publishCarouselToLinkedIn(
  account: LinkedInAccount,
  pdfBuffer: Buffer,
  commentary: string,
  title: string
): Promise<{ postUrn: string; documentUrn: string }> {
  // Se não tiver personId, buscar
  if (!account.personId && !account.pageId) {
    account.personId = await getLinkedInPersonId(account.accessToken);
  }

  // Etapa 1: Registrar upload
  const { uploadUrl, documentUrn } = await registerDocumentUpload(account);
  
  // Etapa 2: Upload do PDF
  await uploadDocument(uploadUrl, pdfBuffer);
  
  // Etapa 3: Aguardar processamento (BUG 4 CORRIGIDO)
  await waitForDocumentAvailable(account, documentUrn);
  
  // Etapa 4: Criar post
  const postUrn = await createLinkedInPost(account, documentUrn, commentary, title);
  
  return { postUrn, documentUrn };
}

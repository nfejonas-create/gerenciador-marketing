import axios from 'axios';

interface LinkedInAccount {
  accessToken: string;
  personId?: string;
  pageId?: string;
}

const LINKEDIN_VERSION = '202504';

// Etapa 1: Registrar upload do documento via Documents API
export async function registerDocumentUpload(
  account: LinkedInAccount
): Promise<{ uploadUrl: string; documentUrn: string }> {
  const owner = account.pageId 
    ? `urn:li:organization:${account.pageId}`
    : `urn:li:person:${account.personId}`;

  console.log('[LinkedIn] Registrando upload de documento...');
  console.log('[LinkedIn] Owner:', owner);

  const registerRes = await axios.post(
    'https://api.linkedin.com/rest/documents',
    {
      initializeUploadRequest: {
        owner,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Linkedin-Version': LINKEDIN_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
    }
  );

  const uploadUrl = registerRes.data.value.uploadUrl;
  const documentUrn = registerRes.data.value.document;

  console.log('[LinkedIn] Document URN:', documentUrn);
  console.log('[LinkedIn] Upload URL obtida');

  return { uploadUrl, documentUrn };
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

// Etapa 3: Verificar status do documento
export async function checkDocumentStatus(
  account: LinkedInAccount,
  documentUrn: string
): Promise<string> {
  const statusRes = await axios.get(
    `https://api.linkedin.com/rest/documents/${encodeURIComponent(documentUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Linkedin-Version': LINKEDIN_VERSION,
      },
    }
  );
  
  return statusRes.data.status; // 'AVAILABLE' ou 'PROCESSING'
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
    {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'Linkedin-Version': LINKEDIN_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
    }
  );

  const postUrn = postRes.headers['x-restli-id'] || '';
  console.log('[LinkedIn] Post criado! URN:', postUrn);
  console.log('[LinkedIn] Response status:', postRes.status);

  return postUrn;
}

// Fluxo completo: publicar carrossel
export async function publishCarouselToLinkedIn(
  account: LinkedInAccount,
  pdfBuffer: Buffer,
  commentary: string,
  title: string
): Promise<{ postUrn: string; documentUrn: string }> {
  // Etapa 1: Registrar upload
  const { uploadUrl, documentUrn } = await registerDocumentUpload(account);
  
  // Etapa 2: Upload do PDF
  await uploadDocument(uploadUrl, pdfBuffer);
  
  // Etapa 3: Aguardar processamento (com retry)
  let attempts = 0;
  let status = 'PROCESSING';
  while (status !== 'AVAILABLE' && attempts < 10) {
    await new Promise(r => setTimeout(r, 1000));
    status = await checkDocumentStatus(account, documentUrn);
    attempts++;
    console.log(`[LinkedIn] Status do documento: ${status} (tentativa ${attempts})`);
  }
  
  if (status !== 'AVAILABLE') {
    throw new Error('Documento não ficou disponível após processamento');
  }
  
  // Etapa 4: Criar post
  const postUrn = await createLinkedInPost(account, documentUrn, commentary, title);
  
  return { postUrn, documentUrn };
}

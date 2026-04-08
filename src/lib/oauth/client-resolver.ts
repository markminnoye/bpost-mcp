import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { oauthClients } from '@/lib/db/schema';

export interface ResolvedClient {
  clientId: string;
  clientName: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  source: 'metadata_document' | 'database';
}

function isUrlFormat(clientId: string): boolean {
  return clientId.startsWith('https://');
}

async function resolveFromMetadataDocument(clientId: string): Promise<ResolvedClient | null> {
  try {
    const response = await fetch(clientId, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const metadata = await response.json();

    // Validate: client_id in document must match the URL we fetched
    if (metadata.client_id !== clientId) return null;
    if (!Array.isArray(metadata.redirect_uris) || metadata.redirect_uris.length === 0) return null;

    return {
      clientId: metadata.client_id,
      clientName: metadata.client_name ?? null,
      redirectUris: metadata.redirect_uris,
      grantTypes: metadata.grant_types ?? ['authorization_code'],
      responseTypes: metadata.response_types ?? ['code'],
      source: 'metadata_document',
    };
  } catch {
    return null;
  }
}

async function resolveFromDatabase(clientId: string): Promise<ResolvedClient | null> {
  const rows = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUris: row.redirectUris,
    grantTypes: row.grantTypes,
    responseTypes: row.responseTypes,
    source: 'database',
  };
}

export async function resolveClient(clientId: string): Promise<ResolvedClient | null> {
  if (isUrlFormat(clientId)) {
    return resolveFromMetadataDocument(clientId);
  }
  return resolveFromDatabase(clientId);
}

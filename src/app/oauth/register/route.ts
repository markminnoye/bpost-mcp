import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { oauthClients } from '@/lib/db/schema';

const RegisterRequestSchema = z.object({
  client_name: z.string().optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  grant_types: z.array(z.string()).optional().default(['authorization_code', 'refresh_token']),
  response_types: z.array(z.string()).optional().default(['code']),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RegisterRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_client_metadata', error_description: parsed.error.message },
        { status: 400 },
      );
    }

    // TODO: Add rate limiting (max 10 registrations per IP per hour)
    // Implement via Vercel Edge Middleware or in-function IP tracking

    const { client_name, redirect_uris, grant_types, response_types } = parsed.data;

    const rawClientId = `mcp_${randomBytes(32).toString('hex')}`;
    const rawClientSecret = `sec_${randomBytes(32).toString('hex')}`;
    const secretHash = createHash('sha256').update(rawClientSecret).digest('hex');

    await db.insert(oauthClients).values({
      clientId: rawClientId,
      clientSecret: secretHash,
      clientName: client_name ?? null,
      redirectUris: redirect_uris,
      grantTypes: grant_types,
      responseTypes: response_types,
    });

    return NextResponse.json(
      {
        client_id: rawClientId,
        client_secret: rawClientSecret,
        client_name: client_name ?? null,
        redirect_uris,
        grant_types,
        response_types,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'server_error', error_description: 'Registration failed' },
      { status: 500 },
    );
  }
}

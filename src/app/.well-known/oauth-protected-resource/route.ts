import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
import { env } from '@/lib/config/env';
import { mcpProtectedResourceUrl } from '@/lib/oauth/resource-url';

const baseUrl = env.NEXT_PUBLIC_BASE_URL;

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl],
  resourceUrl: mcpProtectedResourceUrl(),
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };

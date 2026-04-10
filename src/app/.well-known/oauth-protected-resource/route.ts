import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
import { env } from '@/lib/config/env';

const baseUrl = env.NEXT_PUBLIC_BASE_URL;

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };

import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
  getPublicOrigin,
} from 'mcp-handler';
import { mcpProtectedResourceUrlFromBase } from '@/lib/oauth/resource-url';

const corsHandler = metadataCorsOptionsRequestHandler();

export function GET(request: Request) {
  const base = getPublicOrigin(request);
  return protectedResourceHandler({
    authServerUrls: [base],
    resourceUrl: mcpProtectedResourceUrlFromBase(base),
  })(request);
}

export { corsHandler as OPTIONS };

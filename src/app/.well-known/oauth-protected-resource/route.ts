import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bpost-mcp.vercel.app';

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl],
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };

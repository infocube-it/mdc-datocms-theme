import { core } from '@/site/core';

// The Web Previews plugin calls this endpoint from the DatoCMS dashboard.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Plugin endpoint URL: `https://<site>/api/preview-links?secret=…`. */
export async function POST(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (secret === null || !core.isDraftModeSecret(secret)) {
    return Response.json({ error: 'Invalid secret' }, { status: 401, headers: corsHeaders });
  }

  const { item, itemType } = (await request.json()) as {
    item: { id: string };
    itemType: { attributes: { api_key: string } };
  };
  const previewLinks = await core.previewLinks({
    itemTypeApiKey: itemType.attributes.api_key,
    itemId: item.id,
    origin,
    secret,
  });
  return Response.json({ previewLinks }, { headers: corsHeaders });
}

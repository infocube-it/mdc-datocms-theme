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

  const payload = (await request.json().catch(() => null)) as {
    item?: { id?: string };
    itemType?: { attributes?: { api_key?: string } };
  } | null;
  const itemId = payload?.item?.id;
  const itemTypeApiKey = payload?.itemType?.attributes?.api_key;
  if (!itemId || !itemTypeApiKey) {
    return Response.json({ error: 'Invalid payload' }, { status: 400, headers: corsHeaders });
  }

  const previewLinks = await core.previewLinks({
    itemTypeApiKey,
    itemId,
    origin,
    secret,
  });
  return Response.json({ previewLinks }, { headers: corsHeaders });
}

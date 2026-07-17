export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const returnTo = url.searchParams.get('return') || '/';

  const state = btoa(JSON.stringify({ returnTo, nonce: crypto.randomUUID() }));

  const params = new URLSearchParams({
    client_id: context.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${url.origin}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });

  const headers = new Headers({
    Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  });
  headers.append(
    'Set-Cookie',
    `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`
  );

  return new Response(null, { status: 302, headers });
}

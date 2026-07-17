import { signJWT, parseCookie } from '../../lib/auth.js';

const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  const storedState = parseCookie(context.request.headers.get('cookie'), 'oauth_state');
  if (!storedState || storedState !== state) {
    return new Response('Invalid state — possible CSRF', { status: 400 });
  }

  let returnTo = '/';
  try {
    const parsed = JSON.parse(atob(state));
    if (typeof parsed.returnTo === 'string' && parsed.returnTo.startsWith('/')) {
      returnTo = parsed.returnTo;
    }
  } catch { /* ignore */ }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: context.env.GOOGLE_CLIENT_ID,
      client_secret: context.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error('Token exchange failed:', err);
    return new Response('Authentication failed', { status: 502 });
  }

  const tokens = await tokenRes.json();

  // Decode the ID token payload (we trust Google's token endpoint response)
  const idParts = tokens.id_token.split('.');
  let idPayload;
  try {
    const raw = atob(idParts[1].replace(/-/g, '+').replace(/_/g, '/'));
    idPayload = JSON.parse(raw);
  } catch {
    return new Response('Invalid ID token', { status: 502 });
  }

  const { sub, email, name, picture } = idPayload;
  if (!sub || !email) {
    return new Response('Missing identity fields', { status: 502 });
  }

  // Upsert user — display_name only set on first login; picture refreshed every login
  const existing = await context.env.DB.prepare(
    'SELECT id FROM users WHERE google_sub = ?'
  ).bind(sub).first();

  let userId;
  if (existing) {
    userId = existing.id;
    await context.env.DB.prepare(
      'UPDATE users SET picture = ? WHERE id = ?'
    ).bind(picture || null, userId).run();
  } else {
    userId = crypto.randomUUID();
    await context.env.DB.prepare(
      'INSERT INTO users (id, google_sub, email, display_name, picture) VALUES (?, ?, ?, ?, ?)'
    ).bind(userId, sub, email, name || email, picture || null).run();
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL;
  const jwt = await signJWT({ userId, email, exp }, context.env.JWT_SECRET);

  const headers = new Headers({ Location: returnTo });
  headers.append(
    'Set-Cookie',
    `session=${jwt}; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}; Path=/`
  );
  headers.append(
    'Set-Cookie',
    `oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/`
  );

  return new Response(null, { status: 302, headers });
}

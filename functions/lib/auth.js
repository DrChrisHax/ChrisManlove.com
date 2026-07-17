const ALGO = { name: 'HMAC', hash: 'SHA-256' };
const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(buf) {
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecodeToBytes(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function b64urlEncodeStr(str) {
  return b64urlEncode(enc.encode(str));
}

async function importKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), ALGO, false, ['sign', 'verify']);
}

export async function signJWT(payload, secret) {
  const header = b64urlEncodeStr(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlEncodeStr(JSON.stringify(payload));
  const msg = `${header}.${body}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign(ALGO, key, enc.encode(msg));
  return `${msg}.${b64urlEncode(sig)}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const msg = `${header}.${body}`;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(ALGO, key, b64urlDecodeToBytes(sig), enc.encode(msg));
  if (!valid) return null;
  try {
    const payload = JSON.parse(dec.decode(b64urlDecodeToBytes(body)));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookie(cookieHeader, name) {
  const match = (cookieHeader || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export async function verifySession(context) {
  const token = parseCookie(context.request.headers.get('cookie'), 'session');
  if (!token) return null;
  const payload = await verifyJWT(token, context.env.JWT_SECRET);
  if (!payload) return null;
  const user = await context.env.DB.prepare(
    'SELECT id, email, display_name, picture FROM users WHERE id = ?'
  ).bind(payload.userId).first();
  return user || null;
}

export const ADMIN_EMAIL = 'cmanlove1234@outlook.com';

export function isAdmin(user) {
  return user && user.email === ADMIN_EMAIL;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonError(message, status) {
  return json({ error: message }, status);
}

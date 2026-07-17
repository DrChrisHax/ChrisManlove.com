export async function onRequestGet() {
  const headers = new Headers({ Location: '/' });
  headers.append(
    'Set-Cookie',
    'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'
  );
  return new Response(null, { status: 302, headers });
}

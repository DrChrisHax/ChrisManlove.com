import { verifySession, isAdmin, json, jsonError } from '../../lib/auth.js';

export async function onRequestGet(context) {
  const user = await verifySession(context);
  if (!user) return jsonError('Unauthorized', 401);
  return json({
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    picture: user.picture || null,
    isAdmin: isAdmin(user),
  });
}

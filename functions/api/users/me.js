import { verifySession, json, jsonError, isAdmin } from '../../lib/auth.js';

export async function onRequestPut(context) {
  const user = await verifySession(context);
  if (!user) return jsonError('Unauthorized', 401);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const displayName = (body.displayName || '').trim();
  if (!displayName) return jsonError('Display name is required', 400);
  if (displayName.length > 50) return jsonError('Display name exceeds 50 characters', 400);

  await context.env.DB.prepare(
    'UPDATE users SET display_name = ? WHERE id = ?'
  ).bind(displayName, user.id).run();

  return json({
    id: user.id,
    email: user.email,
    displayName,
    isAdmin: isAdmin(user),
  });
}

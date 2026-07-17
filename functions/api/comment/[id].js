import { verifySession, isAdmin, json, jsonError } from '../../lib/auth.js';

export async function onRequest(context) {
  switch (context.request.method) {
    case 'PUT':     return handlePut(context);
    case 'DELETE':  return handleDelete(context);
    case 'OPTIONS': return new Response(null, { status: 204, headers: corsHeaders() });
    default:        return jsonError('Method not allowed', 405);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handlePut(context) {
  const user = await verifySession(context);
  if (!user) return jsonError('Unauthorized', 401);

  const { id } = context.params;

  const comment = await context.env.DB.prepare(
    'SELECT id, user_id, deleted_at FROM comments WHERE id = ?'
  ).bind(id).first();

  if (!comment) return jsonError('Comment not found', 404);
  if (comment.deleted_at) return jsonError('Cannot edit a deleted comment', 403);
  if (comment.user_id !== user.id) return jsonError('Forbidden', 403);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const text = (body.body || '').trim();
  if (!text) return jsonError('Comment body is required', 400);
  if (text.length > 2000) return jsonError('Comment exceeds 2000 characters', 400);

  await context.env.DB.prepare(
    "UPDATE comments SET body = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(text, id).run();

  const updated = await context.env.DB.prepare(`
    SELECT c.id, c.parent_id, c.user_id, c.body, u.display_name, c.created_at, c.updated_at
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).bind(id).first();

  return json({ ...updated, deleted: false });
}

async function handleDelete(context) {
  const user = await verifySession(context);
  if (!user) return jsonError('Unauthorized', 401);

  const { id } = context.params;

  const comment = await context.env.DB.prepare(
    'SELECT id, user_id, deleted_at FROM comments WHERE id = ?'
  ).bind(id).first();

  if (!comment) return jsonError('Comment not found', 404);
  if (comment.deleted_at) return jsonError('Comment already deleted', 409);
  if (comment.user_id !== user.id && !isAdmin(user)) return jsonError('Forbidden', 403);

  // Soft-delete: set deleted_at, leave body and updated_at untouched
  await context.env.DB.prepare(
    "UPDATE comments SET deleted_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  return json({ id, deleted: true });
}

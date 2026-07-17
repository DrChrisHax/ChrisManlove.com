import { verifySession, json, jsonError } from '../../lib/auth.js';

export async function onRequest(context) {
  switch (context.request.method) {
    case 'GET':    return handleGet(context);
    case 'POST':   return handlePost(context);
    case 'OPTIONS': return new Response(null, { status: 204, headers: corsHeaders() });
    default:       return jsonError('Method not allowed', 405);
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handleGet(context) {
  const { slug } = context.params;

  const { results } = await context.env.DB.prepare(`
    SELECT
      c.id,
      c.parent_id,
      CASE WHEN c.deleted_at IS NOT NULL THEN NULL ELSE c.user_id      END AS user_id,
      CASE WHEN c.deleted_at IS NOT NULL THEN NULL ELSE c.body         END AS body,
      CASE WHEN c.deleted_at IS NOT NULL THEN NULL ELSE u.display_name END AS display_name,
      c.created_at,
      CASE WHEN c.deleted_at IS NOT NULL THEN NULL ELSE c.updated_at   END AS updated_at,
      CASE WHEN c.deleted_at IS NOT NULL THEN 1    ELSE 0              END AS deleted
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_slug = ?
    ORDER BY c.created_at ASC
  `).bind(slug).all();

  return json(results.map(r => ({ ...r, deleted: r.deleted === 1 })));
}

async function handlePost(context) {
  const user = await verifySession(context);
  if (!user) return jsonError('Unauthorized', 401);

  const { slug } = context.params;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const text = (body.body || '').trim();
  if (!text) return jsonError('Comment body is required', 400);
  if (text.length > 2000) return jsonError('Comment exceeds 2000 characters', 400);

  const parentId = body.parent_id || null;

  // Verify parent comment exists and belongs to this post (if provided)
  if (parentId) {
    const parent = await context.env.DB.prepare(
      'SELECT id FROM comments WHERE id = ? AND post_slug = ? AND deleted_at IS NULL'
    ).bind(parentId, slug).first();
    if (!parent) return jsonError('Parent comment not found', 404);
  }

  const id = crypto.randomUUID();
  await context.env.DB.prepare(
    'INSERT INTO comments (id, post_slug, user_id, parent_id, body) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, slug, user.id, parentId, text).run();

  const created = await context.env.DB.prepare(`
    SELECT c.id, c.parent_id, c.user_id, c.body, u.display_name, c.created_at, c.updated_at
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).bind(id).first();

  return json({ ...created, deleted: false }, 201);
}

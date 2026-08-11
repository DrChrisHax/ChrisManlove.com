import { verifySession, json, jsonError } from '../lib/auth.js';

const TO_ADDRESS = 'contact@chrismanlove.com';
const FROM_ADDRESS = 'contact-form@chrismanlove.com';

const MAX_MESSAGE_LENGTH = 20000;
const MAX_TOTAL_ATTACHMENT_BYTES = 3 * 1024 * 1024; // stay well under Cloudflare's 5 MiB total message size after base64 inflation

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const user = await verifySession(context);
  if (!user) return jsonError('You must be signed in to send a message', 401);

  let form;
  try {
    form = await context.request.formData();
  } catch {
    return jsonError('Invalid form submission', 400);
  }

  const firstName = (form.get('firstName') || '').toString().trim().slice(0, 100);
  const lastName = (form.get('lastName') || '').toString().trim().slice(0, 100);
  const email = (form.get('email') || '').toString().trim().slice(0, 200);
  const phone = (form.get('phone') || '').toString().trim().slice(0, 40);
  const message = (form.get('message') || '').toString().trim();

  if (!email || !EMAIL_RE.test(email)) return jsonError('A valid email is required', 400);
  if (!message) return jsonError('Message is required', 400);
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonError(`Message exceeds ${MAX_MESSAGE_LENGTH} characters`, 400);
  }

  const files = form.getAll('files').filter((f) => f instanceof File && f.size > 0);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return jsonError(
      `Attachments exceed the ${Math.floor(MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024))}MB total limit`,
      400
    );
  }

  const attachments = [];
  for (const file of files) {
    const buf = await file.arrayBuffer();
    attachments.push({
      filename: file.name,
      content: arrayBufferToBase64(buf),
      type: file.type || 'application/octet-stream',
      disposition: 'attachment',
    });
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  const textLines = [
    `Name: ${fullName || '(not provided)'}`,
    `Email: ${email}`,
    `Phone: ${phone || '(not provided)'}`,
    '',
    'Message:',
    message,
    '',
    '---',
    `Sent via ChrisManlove.com contact form by signed-in Google account: ${user.display_name} <${user.email}>`,
  ];

  const payload = {
    to: TO_ADDRESS,
    from: FROM_ADDRESS,
    subject: `Contact form message from ${fullName || email}`,
    text: textLines.join('\n'),
    headers: { 'Reply-To': email },
  };
  if (attachments.length > 0) payload.attachments = attachments;

  const cfRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${context.env.CF_ACCOUNT_ID}/email/sending/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${context.env.CF_EMAIL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!cfRes.ok) {
    const detail = await cfRes.text().catch(() => '');
    console.error('Email send failed', cfRes.status, detail);
    return jsonError('Failed to send message', 502);
  }

  return json({ ok: true });
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

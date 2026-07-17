export async function canonicalDomain(context, next) {
  const url = new URL(context.request.url);

  if (url.hostname === 'chrismanlove.com') {
    url.hostname = 'www.chrismanlove.com';
    return Response.redirect(url.toString(), 301);
  }

  return next();
}

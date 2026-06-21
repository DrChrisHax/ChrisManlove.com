import { parse } from 'node-html-parser';

function htmlToMarkdown(html) {
  const root = parse(html);

  root.querySelectorAll('script, style, nav, footer, head').forEach((el) => el.remove());

  function processNode(node) {
    if (node.nodeType === 3) return node.text;

    const tag = node.tagName?.toLowerCase();
    const children = (node.childNodes || []).map(processNode).join('');

    switch (tag) {
      case 'h1': return `\n# ${children.trim()}\n`;
      case 'h2': return `\n## ${children.trim()}\n`;
      case 'h3': return `\n### ${children.trim()}\n`;
      case 'h4': return `\n#### ${children.trim()}\n`;
      case 'h5': return `\n##### ${children.trim()}\n`;
      case 'h6': return `\n###### ${children.trim()}\n`;
      case 'p':  return `\n${children.trim()}\n`;
      case 'strong': case 'b': return `**${children}**`;
      case 'em':    case 'i': return `_${children}_`;
      case 'a': {
        const href = node.getAttribute('href') || '';
        return `[${children}](${href})`;
      }
      case 'ul': return `\n${children}\n`;
      case 'ol': return `\n${children}\n`;
      case 'li': return `- ${children.trim()}\n`;
      case 'code': return `\`${children}\``;
      case 'pre':  return `\n\`\`\`\n${children}\n\`\`\`\n`;
      case 'br':   return '\n';
      case 'hr':   return '\n---\n';
      default:     return children;
    }
  }

  const main = root.querySelector('main') || root;
  return processNode(main).replace(/\n{3,}/g, '\n\n').trim();
}

export async function markdownNegotiation(context, next) {
  const { request } = context;
  const accept = request.headers.get('Accept') || '';
  const response = await next();

  const newHeaders = new Headers(response.headers);
  newHeaders.set('Vary', 'Accept');

  if (!accept.includes('text/markdown')) {
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) {
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }

  const html = await response.text();
  const markdown = htmlToMarkdown(html);

  newHeaders.set('Content-Type', 'text/markdown; charset=utf-8');
  newHeaders.delete('Content-Length');

  return new Response(markdown, { status: response.status, headers: newHeaders });
}

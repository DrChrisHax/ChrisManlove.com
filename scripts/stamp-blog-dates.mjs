import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const today = new Date().toISOString().split('T')[0];

const output = execSync('git diff --cached --name-status').toString().trim();
if (!output) process.exit(0);

for (const line of output.split('\n')) {
  const [status, file] = line.split('\t');
  if (!file || !file.startsWith('src/content/blog/') || !file.endsWith('.md')) continue;
  if (status !== 'A' && status !== 'M') continue;

  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }

  let modified = content;

  if (status === 'A' && !/^createdAt:/m.test(content)) {
    modified = content.replace(/^---\n/, `---\ncreatedAt: ${today}\n`);
  } else if (status === 'M') {
    const created = content.match(/^createdAt:\s*(.+)$/m)?.[1]?.trim();
    const currentUpdated = content.match(/^updatedAt:\s*(.+)$/m)?.[1]?.trim();
    if (created && created !== today && currentUpdated !== today) {
      if (/^updatedAt:/m.test(content)) {
        modified = content.replace(/^updatedAt:\s*.+$/m, `updatedAt: ${today}`);
      } else {
        modified = content.replace(/^(createdAt:.+)$/m, `$1\nupdatedAt: ${today}`);
      }
    }
  }

  if (modified !== content) {
    writeFileSync(file, modified, 'utf8');
    execSync(`git add "${file}"`);
  }
}

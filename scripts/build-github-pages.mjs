import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const moves = [
  ['pages/api', '.github-pages-disabled/api'],
  ['middleware.ts', '.github-pages-disabled/middleware.ts'],
];

function moveAside(from, to) {
  const fromPath = path.join(root, from);
  const toPath = path.join(root, to);
  if (fs.existsSync(fromPath)) {
    fs.renameSync(fromPath, toPath);
  }
}

function restore(from, to) {
  const disabledPath = path.join(root, to);
  const originalPath = path.join(root, from);
  if (fs.existsSync(disabledPath)) {
    fs.renameSync(disabledPath, originalPath);
  }
}

console.log('📦 Building static site for GitHub Pages...');

try {
  moves.forEach(([from, to]) => moveAside(from, to));

  execSync('npx next build', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      NEXT_PUBLIC_GITHUB_PAGES: 'true',
    },
  });

  const outDir = path.join(root, 'out');
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');
  console.log('✅ GitHub Pages build complete → out/');
} finally {
  moves.forEach(([from, to]) => restore(from, to));
}

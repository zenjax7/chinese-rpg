import { defineConfig, loadEnv } from 'vite';
// __CLOUD__ is the compile-time form of VITE_CLOUD_SAVE=1 (docs/tech/api.md). When it is false (the GitHub Pages build) every
// `if (__CLOUD__)` branch folds away, so the account screens (src/ui/account.ts) are not even in dist/.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  const cloud = env.VITE_CLOUD_SAVE === '1';
  // level-editor.md §5.2: the /editor entry (React + React Flow) is a second input, built only for the accounts (Vercel) build, so the
  // Pages build stays byte-identical and the game's chunks never import the editor (tools/check_dist.mjs checks this).
  const input = cloud ? { index: 'index.html', editor: 'editor.html' } : { index: 'index.html' };
  return { base: './', build: { chunkSizeWarningLimit: 2500, rollupOptions: { input } }, define: { __CLOUD__: JSON.stringify(cloud) } };
});

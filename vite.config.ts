import { defineConfig, loadEnv } from 'vite';
// __CLOUD__ is the compile-time form of VITE_CLOUD_SAVE=1 (docs/tech/api.md). When it is false (the GitHub Pages build) every
// `if (__CLOUD__)` branch folds away, so the account screens (src/ui/account.ts) are not even in dist/.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  return { base: './', build: { chunkSizeWarningLimit: 2500 }, define: { __CLOUD__: JSON.stringify(env.VITE_CLOUD_SAVE === '1') } };
});

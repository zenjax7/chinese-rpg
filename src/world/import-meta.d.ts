// Vite's import.meta.glob (tsconfig has "types": [], so vite/client is not loaded; only what graph mode uses).
interface ImportMeta { glob<T = unknown>(pattern: string, opts?: { import?: string; eager?: boolean }): Record<string, () => Promise<T>> }
/** Build flag from vite.config.ts: true only when VITE_CLOUD_SAVE=1 (accounts + cloud save). The Pages build has it false. */
declare const __CLOUD__: boolean;
declare module '*.css';

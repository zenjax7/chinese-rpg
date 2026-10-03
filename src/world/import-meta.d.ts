// Vite's import.meta.glob (tsconfig has "types": [], so vite/client is not loaded; only what graph mode uses).
interface ImportMeta { glob<T = unknown>(pattern: string, opts?: { import?: string; eager?: boolean }): Record<string, () => Promise<T>> }

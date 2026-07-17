import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const combatLabRoot = fileURLToPath(
  new URL('./dev/combat-lab', import.meta.url)
);

export default defineConfig({
  root: combatLabRoot,
  base: './',
  build: {
    outDir: fileURLToPath(new URL('./dev/combat-lab/dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.COMBAT_LAB_PORT ?? 8912),
    strictPort: true,
  },
});

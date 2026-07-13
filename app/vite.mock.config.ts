import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const mockApiPort = Number(process.env.MOCK_API_PORT ?? 8903);
const clientRoot = fileURLToPath(new URL('./src/client', import.meta.url));
const gameHtmlPath = fileURLToPath(
  new URL('./src/client/game.html', import.meta.url)
);
const mockApiTarget = `http://127.0.0.1:${mockApiPort}`;

export default defineConfig({
  root: clientRoot,
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PORT ?? 8902),
    strictPort: true,
    proxy: {
      '/api': mockApiTarget,
      '/creatures': mockApiTarget,
    },
  },
  plugins: [
    {
      name: 'scribbits-mock-root',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (!request.url) {
            next();
            return;
          }

          const url = new URL(request.url, 'http://localhost');
          if (url.pathname === '/') {
            if (url.searchParams.has('fresh')) {
              try {
                const resetResponse = await fetch(
                  `${mockApiTarget}/__mock/reset-fresh`,
                  { method: 'POST' }
                );
                if (!resetResponse.ok) throw new Error('reset rejected');
              } catch {
                response.writeHead(502, { 'Content-Type': 'text/plain' });
                response.end('Scribbits mock backend is unavailable.');
                return;
              }
            }
            request.url = `/game.html${url.search}`;
          }
          next();
        });
      },
      handleHotUpdate(context) {
        if (context.file === gameHtmlPath) {
          context.server.ws.send({ type: 'full-reload', path: '*' });
        }
      },
    },
  ],
});

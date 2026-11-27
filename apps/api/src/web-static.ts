import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/**
 * Em produção, a API também entrega o build do web (mesma origem, uma porta só).
 * Arquivos com hash são imutáveis; index.html e sw.js nunca vão para cache.
 * Sem build do web (ex.: desenvolvimento com Vite), não faz nada.
 */
export function serveWebBuild(app: NestExpressApplication): void {
  const dist = resolve(import.meta.dirname, '../../web/dist');
  const index = resolve(dist, 'index.html');
  if (!existsSync(index)) return;

  app.useStaticAssets(dist, {
    index: false,
    setHeaders: (res, path) => {
      res.setHeader(
        'Cache-Control',
        path.includes(`${resolve(dist, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });

  // Rotas do React Router: qualquer GET de página fora de /api devolve o index.html.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || !req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
}

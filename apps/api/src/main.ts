import { existsSync } from 'node:fs';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Antes de importar o app: variáveis do .env precisam existir na inicialização.
if (existsSync('.env')) process.loadEnvFile();

const { NestFactory } = await import('@nestjs/core');
const { AppModule } = await import('./app.module.js');
const { configureApp } = await import('./app.setup.js');
const { serveWebBuild } = await import('./web-static.js');

const app = await NestFactory.create<NestExpressApplication>(AppModule);
configureApp(app);
serveWebBuild(app);
await app.listen(process.env.PORT ?? 3000);

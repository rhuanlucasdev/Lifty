import { StandardSchemaValidationPipe, type INestApplication } from '@nestjs/common';

/**Configuracao compartilhada entre main.ts e os testes e2e */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();
  return app;
}

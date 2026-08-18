import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();

  const authServiceUrl =
    process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const dataServiceUrl =
    process.env.DATA_SERVICE_URL || 'http://localhost:3000';

  app.use(
    createProxyMiddleware({
      pathFilter: ['/auth', '/config'],
      target: authServiceUrl,
      changeOrigin: true,
    }),
  );

  app.use(
    createProxyMiddleware({
      pathFilter: '/items',
      target: dataServiceUrl,
      changeOrigin: true,
    }),
  );

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Gateway service listening on port ${port}`);
  console.log(`Proxying /auth, /config -> ${authServiceUrl}`);
  console.log(`Proxying /items -> ${dataServiceUrl}`);
}

bootstrap();

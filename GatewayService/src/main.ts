import { NestFactory } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as swaggerUi from 'swagger-ui-express';
import { AppModule } from './app.module';
import { DocsAggregatorService } from './docs/docs-aggregator.service';

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

  const docsAggregator = app.get(DocsAggregatorService);
  const mergedDocument = await docsAggregator.buildMergedDocument();
  app.use('/docs', (_req: Request, res: Response, next: NextFunction) => {
    // Swagger UI's HTML relies on inline scripts/styles that helmet's
    // default CSP blocks.
    res.removeHeader('Content-Security-Policy');
    next();
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(mergedDocument));

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Gateway service listening on port ${port}`);
  console.log(`Proxying /auth, /config -> ${authServiceUrl}`);
  console.log(`Proxying /items -> ${dataServiceUrl}`);
}

bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { sanitize } from 'express-mongo-sanitize';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers — CSP disabled so Swagger UI inline scripts are allowed
  app.use(helmet({ contentSecurityPolicy: false }));

  // Strip MongoDB operators — skip req.query (read-only getter in Node 24+)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body) req.body = sanitize(req.body) as unknown;
    if (req.params) req.params = sanitize(req.params);
    next();
  });

  // Cookie parsing (needed for httpOnly refresh token)
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('EasyGenerator Auth API')
    .setDescription(
      'User authentication API — refresh token delivered as httpOnly cookie',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
void bootstrap();

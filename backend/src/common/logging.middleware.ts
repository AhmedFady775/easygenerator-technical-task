import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const ms = Date.now() - start;
      const level =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger[level](`${method} ${originalUrl} ${statusCode} +${ms}ms`);
    });

    next();
  }
}

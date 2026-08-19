import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, path } = request;
    const start = Date.now();

    this.logger.log(`--> ${method} ${path}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - start;
          this.logger.log(`<-- ${method} ${path} ${response.statusCode} ${duration}ms`);
        },
        error: (err) => {
          const duration = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.error(`<-- ${method} ${path} ${status} ${duration}ms`);
        },
      }),
    );
  }
}

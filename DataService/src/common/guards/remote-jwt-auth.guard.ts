import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TOKEN_VALIDATOR, TokenValidator } from '../../auth-client/token-validator.interface';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RemoteJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VALIDATOR) private readonly tokenValidator: TokenValidator,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    const user = await this.tokenValidator.validate(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as any).user = user;
    return true;
  }
}

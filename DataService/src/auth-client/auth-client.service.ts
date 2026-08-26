import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { TokenValidator, ValidatedUser } from './token-validator.interface';

@Injectable()
export class AuthClientService implements TokenValidator {
  private readonly logger = new Logger(AuthClientService.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async validate(token: string): Promise<ValidatedUser | null> {
    const authServiceUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://localhost:3001');

    try {
      const response = await firstValueFrom(
        this.http.post<ValidatedUser>(`${authServiceUrl}/auth/validate`, { token }),
      );
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError;

      if (axiosError.response) {
        // auth-config rejected the token outright (expired, invalid, or the
        // user is now inactive) — that's "not authenticated", not a server
        // error on our end.
        return null;
      }

      this.logger.error('Cannot reach auth-config to validate token', axiosError.message);
      throw new HttpException('Auth service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}

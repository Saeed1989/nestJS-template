import { Injectable, NotImplementedException } from '@nestjs/common';
import { TokenValidator, ValidatedUser } from './token-validator.interface';

@Injectable()
export class AuthClientService implements TokenValidator {
  async validate(_token: string): Promise<ValidatedUser | null> {
    throw new NotImplementedException(
      'RemoteTokenValidator not implemented — set AUTH_MODE=mock',
    );
  }
}

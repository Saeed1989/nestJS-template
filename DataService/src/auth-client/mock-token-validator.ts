import { Injectable } from '@nestjs/common';
import { TokenValidator, ValidatedUser } from './token-validator.interface';

// Single source of truth for the mock user — referenced only here
export const MOCK_USER: ValidatedUser = {
  id: 'mock-user-id-0000-0000-000000000001',
  email: 'mock@example.com',
  roles: ['user'],
};

@Injectable()
export class MockTokenValidator implements TokenValidator {
  async validate(_token: string): Promise<ValidatedUser> {
    return MOCK_USER;
  }
}

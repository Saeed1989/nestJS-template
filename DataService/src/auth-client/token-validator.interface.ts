export interface ValidatedUser {
  id: string;
  email: string;
  roles: string[];
}

export interface TokenValidator {
  validate(token: string): Promise<ValidatedUser | null>;
}

export const TOKEN_VALIDATOR = 'TOKEN_VALIDATOR';

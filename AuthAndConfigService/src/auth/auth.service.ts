import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from './auth.constants';

type SafeUser = { id: string; email: string; name: string; roles: string[]; tokenVersion: number };

interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(ACCESS_JWT_SERVICE) private readonly accessJwt: JwtService,
    @Inject(REFRESH_JWT_SERVICE) private readonly refreshJwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
    });

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.issueTokens(safeUser);
  }

  login(user: SafeUser) {
    return this.issueTokens(user);
  }

  async refresh(token: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = this.refreshJwt.verify<RefreshTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return this.issueTokens(safeUser);
  }

  async validateAccessToken(token: string) {
    try {
      const payload = this.accessJwt.verify<AccessTokenPayload>(token);
      return { id: payload.sub, email: payload.email, roles: payload.roles };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private issueTokens(user: SafeUser) {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    return {
      accessToken: this.accessJwt.sign(accessPayload),
      refreshToken: this.refreshJwt.sign(refreshPayload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
    };
  }
}

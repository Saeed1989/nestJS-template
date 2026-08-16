import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from './auth.constants';

@Module({
  imports: [UsersModule, PassportModule, ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    {
      provide: ACCESS_JWT_SERVICE,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: { expiresIn: '15m' },
        }),
      inject: [ConfigService],
    },
    {
      provide: REFRESH_JWT_SERVICE,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('JWT_REFRESH_SECRET'),
          signOptions: { expiresIn: '7d' },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}

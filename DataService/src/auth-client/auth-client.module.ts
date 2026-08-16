import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TOKEN_VALIDATOR } from './token-validator.interface';
import { MockTokenValidator } from './mock-token-validator';
import { AuthClientService } from './auth-client.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    MockTokenValidator,
    AuthClientService,
    {
      provide: TOKEN_VALIDATOR,
      useFactory: (configService: ConfigService, mockValidator: MockTokenValidator, authClientService: AuthClientService) => {
        const authMode = configService.get<string>('AUTH_MODE', 'mock');
        return authMode === 'remote' ? authClientService : mockValidator;
      },
      inject: [ConfigService, MockTokenValidator, AuthClientService],
    },
  ],
  exports: [TOKEN_VALIDATOR],
})
export class AuthClientModule {}

import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthClientModule } from '../auth-client/auth-client.module';
import { RemoteJwtAuthGuard } from '../common/guards/remote-jwt-auth.guard';

@Module({
  imports: [PrismaModule, AuthClientModule],
  controllers: [ItemsController],
  providers: [ItemsService, RemoteJwtAuthGuard],
})
export class ItemsModule {}

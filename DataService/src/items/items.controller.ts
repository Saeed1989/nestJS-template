import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RemoteJwtAuthGuard } from '../common/guards/remote-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../common/interceptors/timeout.interceptor';
import { ValidatedUser } from '../auth-client/token-validator.interface';

@ApiTags('items')
@Controller('items')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Public()
  findAll(@Query() query: PaginationQueryDto) {
    return this.itemsService.findAll(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RemoteJwtAuthGuard)
  create(@Body() createItemDto: CreateItemDto, @CurrentUser() user: ValidatedUser) {
    return this.itemsService.create(createItemDto, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(RemoteJwtAuthGuard)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: ValidatedUser,
  ) {
    return this.itemsService.update(id, updateItemDto, user);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RemoteJwtAuthGuard)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ValidatedUser) {
    return this.itemsService.remove(id, user);
  }
}

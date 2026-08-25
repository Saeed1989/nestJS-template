import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

type Actor = { id: string; email: string; roles: string[] };

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto, @CurrentUser() actor: Actor, @Req() req: Request) {
    return this.adminService.createUser(dto, actor, req.ip);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: Actor,
    @Req() req: Request,
  ) {
    return this.adminService.updateUser(id, dto, actor, req.ip);
  }

  @Delete('users/:id')
  deactivateUser(@Param('id') id: string, @CurrentUser() actor: Actor, @Req() req: Request) {
    return this.adminService.deactivateUser(id, actor, req.ip);
  }

  @Post('users/:id/reactivate')
  reactivateUser(@Param('id') id: string, @CurrentUser() actor: Actor, @Req() req: Request) {
    return this.adminService.reactivateUser(id, actor, req.ip);
  }

  @Get('audit')
  listAudit(@Query() query: ListAuditQueryDto) {
    return this.adminService.listAuditLogs(query);
  }
}

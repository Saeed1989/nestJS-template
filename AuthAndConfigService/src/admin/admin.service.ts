import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { User } from '../generated/prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { SUPER_ADMIN } from './roles.constant';

type Actor = { id: string; email: string; roles: string[] };

function toAdminUser(user: User) {
  const { id, email, roles, isActive, mustChangePassword, createdAt, updatedAt } = user;
  return { id, email, roles, isActive, mustChangePassword, createdAt, updatedAt };
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async listUsers(query: ListUsersQueryDto) {
    const { page, limit, search, includeInactive } = query;

    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map(toAdminUser),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getUser(id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return toAdminUser(user);
  }

  async createUser(dto: CreateUserDto, actor: Actor, ip?: string) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          passwordHash,
          roles: dto.roles,
          mustChangePassword: true,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'user.create',
          targetUserId: user.id,
          changes: { email: dto.email, name: dto.name, roles: dto.roles },
          ip: ip ?? null,
        },
      });
      return user;
    });

    return toAdminUser(created);
  }

  async updateUser(id: string, dto: UpdateUserDto, actor: Actor, ip?: string) {
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('User not found');

    this.assertActorCanModify(target, actor, 'modify');

    if (dto.roles && id === actor.id) {
      throw new ConflictException('Cannot change your own roles');
    }

    if (dto.roles && !dto.roles.includes(SUPER_ADMIN) && (await this.isLastSuperAdmin(id, target))) {
      throw new ConflictException('Cannot remove the last super admin');
    }

    const data: { roles?: string[]; name?: string } = {};
    if (dto.roles) data.roles = dto.roles;
    if (dto.name) data.name = dto.name;

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'user.update',
          targetUserId: id,
          changes: data,
          ip: ip ?? null,
        },
      });
      return user;
    });

    return toAdminUser(updated);
  }

  async deactivateUser(id: string, actor: Actor, ip?: string) {
    if (id === actor.id) throw new ConflictException('Cannot deactivate yourself');

    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('User not found');

    this.assertActorCanModify(target, actor, 'deactivate');

    if (await this.isLastSuperAdmin(id, target)) {
      throw new ConflictException('Cannot deactivate the last super admin');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { isActive: false, tokenVersion: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'user.deactivate',
          targetUserId: id,
          changes: { isActive: false },
          ip: ip ?? null,
        },
      });
      return user;
    });

    return toAdminUser(updated);
  }

  async reactivateUser(id: string, actor: Actor, ip?: string) {
    const target = await this.usersService.findById(id);
    if (!target) throw new NotFoundException('User not found');

    this.assertActorCanModify(target, actor, 'reactivate');

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: { isActive: true } });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'user.reactivate',
          targetUserId: id,
          changes: { isActive: true },
          ip: ip ?? null,
        },
      });
      return user;
    });

    return toAdminUser(updated);
  }

  async listAuditLogs(query: ListAuditQueryDto) {
    const { page, limit } = query;

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // A plain `admin` may never modify (edit, deactivate, or reactivate) a
  // `super_admin` row — only another super admin can.
  private assertActorCanModify(target: User, actor: Actor, verb: string): void {
    if (target.roles.includes(SUPER_ADMIN) && !actor.roles.includes(SUPER_ADMIN)) {
      throw new ForbiddenException(`Only a super admin can ${verb} a super admin`);
    }
  }

  // True when `target` currently holds super_admin and no other active user does.
  private async isLastSuperAdmin(targetId: string, target: User): Promise<boolean> {
    if (!target.roles.includes(SUPER_ADMIN)) return false;
    const otherActiveSuperAdmins = await this.prisma.user.count({
      where: { id: { not: targetId }, roles: { has: SUPER_ADMIN }, isActive: true },
    });
    return otherActiveSuperAdmins === 0;
  }
}

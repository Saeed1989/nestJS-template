import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValidatedUser } from '../auth-client/token-validator.interface';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: PaginationQueryDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    return this.prisma.item.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Item with id "${id}" not found`);
    }
    return item;
  }

  create(dto: CreateItemDto, user: ValidatedUser) {
    return this.prisma.item.create({
      data: {
        title: dto.title,
        description: dto.description,
        ownerId: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateItemDto, user: ValidatedUser) {
    const item = await this.findOne(id);
    this.assertOwnership(item.ownerId, user);
    return this.prisma.item.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  async remove(id: string, user: ValidatedUser) {
    const item = await this.findOne(id);
    this.assertOwnership(item.ownerId, user);
    return this.prisma.item.delete({ where: { id } });
  }

  private assertOwnership(ownerId: string, user: ValidatedUser): void {
    const isOwner = ownerId === user.id;
    const isAdmin = user.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to modify this item');
    }
  }
}

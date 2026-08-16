import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.setting.findMany();
  }

  async findByKey(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return setting;
  }

  create(dto: CreateSettingDto) {
    return this.prisma.setting.create({ data: dto });
  }

  async update(key: string, dto: UpdateSettingDto) {
    await this.findByKey(key);
    return this.prisma.setting.update({ where: { key }, data: dto });
  }

  async remove(key: string) {
    await this.findByKey(key);
    return this.prisma.setting.delete({ where: { key } });
  }
}

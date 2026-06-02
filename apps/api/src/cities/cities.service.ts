import { Injectable, NotFoundException } from '@nestjs/common';
import { City } from '@prisma/client';
import { Lang, localizeCity } from '../common/i18n/localize';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateCityDto, UpdateCityDto } from './dto/city.dto';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(lang: Lang = 'uk'): Promise<City[]> {
    const cities = await this.prisma.city.findMany({ orderBy: { name: 'asc' } });
    return cities.map((c) => localizeCity(c, lang) as City);
  }

  create(dto: CreateCityDto): Promise<City> {
    return this.prisma.city.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        slug: dto.slug ?? slugify(dto.name),
      },
    });
  }

  async update(id: string, dto: UpdateCityDto): Promise<City> {
    await this.ensureExists(id);
    return this.prisma.city.update({
      where: { id },
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        slug: dto.slug ?? (dto.name ? slugify(dto.name) : undefined),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.city.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) {
      throw new NotFoundException('City not found');
    }
  }
}

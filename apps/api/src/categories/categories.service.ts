import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from '@prisma/client';
import { Lang, localizeCategory } from '../common/i18n/localize';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slugify';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(lang: Lang = 'uk'): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => localizeCategory(c, lang) as Category);
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        slug: dto.slug ?? slugify(dto.name),
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.ensureExists(id);
    return this.prisma.category.update({
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
    await this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }
}

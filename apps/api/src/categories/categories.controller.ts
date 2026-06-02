import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Category } from '@prisma/client';
import { LangQueryDto } from '../common/i18n/lang-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all categories' })
  findAll(@Query() { lang }: LangQueryDto): Promise<Category[]> {
    return this.categories.findAll(lang);
  }
}

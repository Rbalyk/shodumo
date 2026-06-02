import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { City } from '@prisma/client';
import { LangQueryDto } from '../common/i18n/lang-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { CitiesService } from './cities.service';

@ApiTags('cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all cities' })
  findAll(@Query() { lang }: LangQueryDto): Promise<City[]> {
    return this.cities.findAll(lang);
  }
}

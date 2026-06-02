import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  pageCount!: number;
}

export class Paginated<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: PaginationMeta })
  meta!: PaginationMeta;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit) || 0,
    },
  };
}

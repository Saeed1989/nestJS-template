import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 20))
  limit: number = 20;
}

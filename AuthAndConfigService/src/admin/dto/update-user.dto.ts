import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ROLES } from '../roles.constant';

export class UpdateUserDto {
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES, { each: true })
  roles?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

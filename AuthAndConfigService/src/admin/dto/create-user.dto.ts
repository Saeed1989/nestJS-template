import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ROLES } from '../roles.constant';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLES, { each: true })
  roles: string[];
}

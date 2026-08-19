import { IsString, MinLength } from 'class-validator';

export class AuthRequestRefreshToken {
  @IsString()
  @MinLength(1)
  refreshToken: string;
}

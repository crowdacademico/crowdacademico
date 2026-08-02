import { IsString, MinLength } from 'class-validator';

export class RefreshTokenRequestDto {
  @IsString()
  @MinLength(1)
  refreshToken: string;
}

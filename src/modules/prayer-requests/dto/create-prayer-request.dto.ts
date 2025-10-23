import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { PrayerRequestCategory } from '@prisma/client';

export class CreatePrayerRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(PrayerRequestCategory)
  category: PrayerRequestCategory;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;

  @IsString()
  @IsNotEmpty()
  communityId: string;

  @IsString()
  @IsOptional()
  memberId?: string;
}


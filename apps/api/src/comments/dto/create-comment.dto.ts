import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @IsUUID()
  ticketId: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

import { IsOptional, IsUUID } from 'class-validator';

export class FindCommentsQueryDto {
  @IsOptional()
  @IsUUID()
  ticketId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

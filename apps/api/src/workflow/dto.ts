import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateApprovalDto {
  @ApiProperty({ example: "estimate" }) @IsString() entityType!: string;
  @ApiProperty() @IsString() entityId!: string;
  @ApiProperty() @IsString() @MinLength(1) title!: string;
}

export class TransitionDto {
  @ApiProperty({ enum: ["REVIEW", "APPROVE", "REJECT"] })
  @IsIn(["REVIEW", "APPROVE", "REJECT"])
  action!: "REVIEW" | "APPROVE" | "REJECT";

  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}

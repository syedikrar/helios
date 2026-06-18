import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateCostItemDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
  @ApiProperty() @IsString() @MinLength(1) description!: string;
  @ApiProperty() @IsString() discipline!: string;
  @ApiProperty() @IsString() category!: string;
  @ApiProperty() @IsString() unit!: string;
  @ApiProperty({ description: "Base rate in minor units (cents)" })
  @IsInt() @Min(0) baseRate!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() locationFactor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isParametric?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() paramName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paramUnit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() paramBase?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() paramExponent?: number;
}

export class UpdateCostItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() discipline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() unit?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) baseRate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() locationFactor?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() region?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
}

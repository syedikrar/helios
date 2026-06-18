import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@helios.demo" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Helios@Demo123" })
  @IsString()
  @MinLength(1)
  password!: string;
}

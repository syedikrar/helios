import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "@helios/types";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { CurrentUser, Public } from "./decorators";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  @ApiOkResponse({ description: "Returns a JWT and the authenticated user." })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOkResponse({ description: "The current authenticated user." })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}

import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { RbacController } from "./rbac.controller";

@Module({
  controllers: [UsersController, RbacController],
  providers: [UsersService],
})
export class UsersModule {}

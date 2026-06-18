import { Body, Controller, Delete, Get, Param, Post, Query, Module, Injectable, ForbiddenException } from "@nestjs/common";
import { ApiBearerAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";
import type { AuthUser } from "@helios/types";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentUser } from "../auth/decorators";

class CreateCommentDto {
  @ApiProperty() @IsString() entityType!: string;
  @ApiProperty() @IsString() entityId!: string;
  @ApiProperty() @IsString() @MinLength(1) body!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string;
}

@Injectable()
class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string, entityType: string, entityId: string) {
    return this.prisma.comment.findMany({
      where: { orgId, entityType, entityId },
      orderBy: { createdAt: "asc" },
    });
  }

  create(user: AuthUser, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        orgId: user.orgId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        authorId: user.id,
        authorName: user.name || user.email,
        body: dto.body,
        parentId: dto.parentId,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id, orgId: user.orgId },
    });
    if (!comment) return { id, deleted: true };
    // Authors delete their own; admins delete any.
    if (comment.authorId !== user.id && !user.roles.includes("ADMIN")) {
      throw new ForbiddenException("Can only delete your own comments");
    }
    await this.prisma.comment.delete({ where: { id } });
    return { id, deleted: true };
  }
}

// Comments are available to any authenticated user (no module permission gate).
@ApiTags("Comments")
@ApiBearerAuth()
@Controller("comments")
class CommentsController {
  constructor(private readonly service: CommentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
  ) {
    return this.service.list(user.orgId, entityType, entityId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return this.service.create(user, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}

@Module({
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}

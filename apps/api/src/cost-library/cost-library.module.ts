import { Module } from "@nestjs/common";
import { CostLibraryService } from "./cost-library.service";
import { CostLibraryController } from "./cost-library.controller";

@Module({
  controllers: [CostLibraryController],
  providers: [CostLibraryService],
})
export class CostLibraryModule {}

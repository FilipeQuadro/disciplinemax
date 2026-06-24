import { Module } from "@nestjs/common";
import { KairosService } from "./kairos.service";
import { KairosController } from "./kairos.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [KairosController],
  providers: [KairosService],
  exports: [KairosService],
})
export class KairosModule {}

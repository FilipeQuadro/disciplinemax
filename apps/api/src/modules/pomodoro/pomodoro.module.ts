import { Module } from "@nestjs/common";
import { PomodoroService } from "./pomodoro.service";
import { PomodoroController } from "./pomodoro.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PomodoroController],
  providers: [PomodoroService],
})
export class PomodoroModule {}

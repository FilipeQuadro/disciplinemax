import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, Request,
} from "@nestjs/common";
import { PomodoroService } from "./pomodoro.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("pomodoro")
@UseGuards(JwtAuthGuard)
export class PomodoroController {
  constructor(private readonly pomodoroService: PomodoroService) {}

  @Post("sessions")
  createSession(
    @Request() req: any,
    @Body() body: { durationMin: number; breakMin: number; taskId?: string },
  ) {
    return this.pomodoroService.createSession(req.user.id, body);
  }

  @Patch("sessions/:id")
  completeSession(@Request() req: any, @Param("id") id: string) {
    return this.pomodoroService.completeSession(req.user.id, id);
  }

  @Get("sessions")
  getSessions(@Request() req: any) {
    return this.pomodoroService.getSessions(req.user.id);
  }

  @Get("stats")
  getStats(@Request() req: any) {
    return this.pomodoroService.getStats(req.user.id);
  }
}

import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
} from "@nestjs/common";
import { HabitFrequency } from "@prisma/client";
import { HabitsService } from "./habits.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("habits")
@UseGuards(JwtAuthGuard)
export class HabitsController {
  constructor(private readonly habitsService: HabitsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.habitsService.findAll(req.user.id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { name: string; description?: string; icon?: string; color?: string; frequency?: HabitFrequency; targetCount?: number },
  ) {
    return this.habitsService.create(req.user.id, body);
  }

  @Patch(":id")
  update(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.habitsService.update(req.user.id, id, body);
  }

  @Delete(":id")
  remove(@Request() req: any, @Param("id") id: string) {
    return this.habitsService.remove(req.user.id, id);
  }

  @Post(":id/log")
  logHabit(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: { date: string; count?: number; note?: string },
  ) {
    return this.habitsService.logHabit(
      req.user.id,
      id,
      new Date(body.date),
      body.count || 1,
      body.note,
    );
  }

  @Get("streak")
  getStreak(@Request() req: any) {
    return this.habitsService.getStreak(req.user.id);
  }
}

import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
} from "@nestjs/common";
import { GoalsService } from "./goals.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("goals")
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.goalsService.findAll(req.user.id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { title: string; description?: string; type: string; targetValue: number; deadline?: string },
  ) {
    return this.goalsService.create(req.user.id, body);
  }

  @Patch(":id")
  updateProgress(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: { currentValue: number },
  ) {
    return this.goalsService.updateProgress(req.user.id, id, body.currentValue);
  }

  @Delete(":id")
  remove(@Request() req: any, @Param("id") id: string) {
    return this.goalsService.remove(req.user.id, id);
  }
}

import { Controller, Get, UseGuards, Request } from "@nestjs/common";
import { GamificationService } from "./gamification.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("gamification")
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get("level")
  getLevel(@Request() req: any) {
    return this.gamificationService.getLevel(req.user.id);
  }

  @Get("achievements")
  getAchievements(@Request() req: any) {
    return this.gamificationService.getAchievements(req.user.id);
  }

  @Get("achievements/available")
  getAvailableAchievements(@Request() req: any) {
    return this.gamificationService.getAvailableAchievements(req.user.id);
  }
}

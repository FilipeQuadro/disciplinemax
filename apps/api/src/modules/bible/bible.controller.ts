import {
  Controller, Get, Post, Delete, Body, Param, UseGuards, Request,
} from "@nestjs/common";
import { BibleService } from "./bible.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("bible")
@UseGuards(JwtAuthGuard)
export class BibleController {
  constructor(private readonly bibleService: BibleService) {}

  @Get("readings")
  getReadings(@Request() req: any) {
    return this.bibleService.getReadings(req.user.id);
  }

  @Post("readings")
  recordReading(
    @Request() req: any,
    @Body() body: { book: string; chapter: number; planId?: string },
  ) {
    return this.bibleService.recordReading(
      req.user.id,
      body.book,
      body.chapter,
      body.planId,
    );
  }

  @Delete("readings/:id")
  removeReading(@Request() req: any, @Param("id") id: string) {
    return this.bibleService.removeReading(req.user.id, id);
  }

  @Get("plans")
  getPlans() {
    return this.bibleService.getPlans();
  }

  @Get("progress")
  getProgress(@Request() req: any) {
    return this.bibleService.getProgress(req.user.id);
  }
}

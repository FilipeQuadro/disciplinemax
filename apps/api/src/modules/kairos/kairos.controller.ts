import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { KairosService } from "./kairos.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("kairos")
@UseGuards(JwtAuthGuard)
export class KairosController {
  constructor(private readonly kairosService: KairosService) {}

  @Post("chat")
  async chat(@Request() req: any, @Body() body: { type: string; message: string }) {
    return this.kairosService.chat(req.user.id, {
      type: body.type,
      message: body.message,
      context: { auth_token: req.headers.authorization },
    });
  }

  @Post("insights")
  async insights(@Request() req: any) {
    return this.kairosService.getInsights(req.user.id, {
      auth_token: req.headers.authorization,
    });
  }

  @Post("recommendations")
  async recommendations(@Request() req: any) {
    return this.kairosService.getRecommendations(req.user.id, {
      auth_token: req.headers.authorization,
    });
  }

  @Get("interactions")
  async interactions(@Request() req: any, @Query("limit") limit?: string) {
    return this.kairosService.getInteractions(req.user.id, limit ? parseInt(limit) : 50);
  }

  @Get("context")
  async getContext(@Request() req: any) {
    return this.kairosService.getUserContext(req.user.id);
  }

  @Get("profile")
  async getProfile(@Request() req: any) {
    return this.kairosService.getProfile(req.user.id);
  }

  @Patch("profile")
  async updateProfile(
    @Request() req: any,
    @Body() body: { personality?: string; preferences?: Prisma.JsonObject },
  ) {
    return this.kairosService.updateProfile(req.user.id, body);
  }
}

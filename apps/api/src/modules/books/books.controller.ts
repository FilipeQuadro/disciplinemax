import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request,
} from "@nestjs/common";
import { BooksService } from "./books.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("books")
@UseGuards(JwtAuthGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.booksService.findAll(req.user.id);
  }

  @Get("stats")
  getStats(@Request() req: any) {
    return this.booksService.getStats(req.user.id);
  }

  @Get(":id")
  findOne(@Request() req: any, @Param("id") id: string) {
    return this.booksService.findOne(req.user.id, id);
  }

  @Post()
  create(
    @Request() req: any,
    @Body() body: { title: string; author?: string; totalPages: number; coverUrl?: string },
  ) {
    return this.booksService.create(req.user.id, body);
  }

  @Patch(":id")
  updateProgress(
    @Request() req: any,
    @Param("id") id: string,
    @Body() body: { pagesRead: number },
  ) {
    return this.booksService.updateProgress(req.user.id, id, body.pagesRead);
  }

  @Delete(":id")
  remove(@Request() req: any, @Param("id") id: string) {
    return this.booksService.remove(req.user.id, id);
  }
}

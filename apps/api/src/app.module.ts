import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BooksModule } from "./modules/books/books.module";
import { BibleModule } from "./modules/bible/bible.module";
import { PomodoroModule } from "./modules/pomodoro/pomodoro.module";
import { HabitsModule } from "./modules/habits/habits.module";
import { GamificationModule } from "./modules/gamification/gamification.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { KairosModule } from "./modules/kairos/kairos.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BooksModule,
    BibleModule,
    PomodoroModule,
    HabitsModule,
    GamificationModule,
    GoalsModule,
    KairosModule,
  ],
})
export class AppModule {}

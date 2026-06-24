import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") || [
      "http://localhost:3000",
    ],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`DisciplinaApp API rodando na porta ${port}`);
}

bootstrap();

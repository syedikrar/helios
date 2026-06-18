import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/transform.interceptor";
import { AllExceptionsFilter } from "./common/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5175",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // OpenAPI docs — the "open platform" differentiator (Section 3.1 #28).
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Helios API")
    .setDescription("Total Cost & Turnaround Management Platform — REST API")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  Logger.log(`Helios API listening on http://localhost:${port}/api`, "Bootstrap");
  Logger.log(`Swagger docs at http://localhost:${port}/api/docs`, "Bootstrap");
}

bootstrap();

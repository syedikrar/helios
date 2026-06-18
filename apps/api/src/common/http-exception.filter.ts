import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { ApiError } from "@helios/types";

// Normalises all errors to the shared `{ statusCode, message, error }` shape.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = "Internal server error";
    let error = "InternalServerError";

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") {
        message = response;
      } else if (typeof response === "object" && response !== null) {
        const r = response as Record<string, unknown>;
        message = (r.message as string | string[]) ?? exception.message;
        error = (r.error as string) ?? exception.name;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const body: ApiError = { statusCode: status, message, error };
    this.logger.warn(`${req.method} ${req.url} -> ${status}`);
    res.status(status).json(body);
  }
}

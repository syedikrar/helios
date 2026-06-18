import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { ApiResponse } from "@helios/types";

// Wraps every successful response in the shared `{ data, meta }` envelope.
// If a handler already returns an object with a `data` key, it is passed through.
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _ctx: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload: any) => {
        if (payload && typeof payload === "object" && "data" in payload) {
          return payload as ApiResponse<T>;
        }
        return { data: payload as T };
      }),
    );
  }
}

import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ClerkUser } from "./auth.guard";

export const User = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClerkUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);


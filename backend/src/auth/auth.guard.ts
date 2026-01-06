import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyToken } from "@clerk/backend";

export interface ClerkUser {
  userId: string;
  email: string;
  name: string | null;
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing authorization header");
    }

    const token = authHeader.split(" ")[1];

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      const user: ClerkUser = {
        userId: payload.sub,
        email: (payload as Record<string, unknown>).email as string ?? "",
        name: null,
      };

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}

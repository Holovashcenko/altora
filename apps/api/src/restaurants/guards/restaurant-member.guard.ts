import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService as ActualPrisma } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantMemberGuard implements CanActivate {
  constructor(private readonly prisma: ActualPrisma) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user || !user.id) {
      // JwtAuthGuard should have rejected earlier, but safeguard.
      throw new ForbiddenException('Authentication required');
    }

    const membership = await this.prisma.restaurantMember.findFirst({
      where: { userId: user.id },
      include: { restaurant: true },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of any restaurant');
    }

    // Attach for downstream handlers/decorators
    req.restaurant = membership.restaurant;
    req.membership = membership;

    return true;
  }
}

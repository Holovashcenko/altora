import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async updateRestaurant(restaurantId: string, input: { name?: string; timezone?: string; currency?: string }) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.prisma.restaurant.update({ where: { id: restaurantId }, data: input });
  }

  async listMembers(restaurantId: string) {
    return this.prisma.restaurantMember.findMany({ where: { restaurantId } });
  }

  async removeMember(restaurantId: string, userId: string) {
    // Prevent removing the last owner would be a future enhancement; for v1 enforce owner-only callsite
    const membership = await this.prisma.restaurantMember.findUnique({ where: { userId_restaurantId: { userId, restaurantId } } });

    if (!membership) throw new NotFoundException('Membership not found');

    await this.prisma.restaurantMember.delete({ where: { userId_restaurantId: { userId, restaurantId } } });

    return { success: true };
  }
}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { RestaurantMemberGuard } from './guards/restaurant-member.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, RestaurantMemberGuard, RolesGuard],
})
export class RestaurantsModule {}

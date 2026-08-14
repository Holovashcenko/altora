import { Controller, Get, Patch, Body, UseGuards, Delete, Param } from '@nestjs/common';

import { RestaurantsService } from './restaurants.service';
import { RestaurantMemberGuard } from './guards/restaurant-member.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentRestaurant } from './decorators/current-restaurant.decorator';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Controller('restaurants')
@UseGuards(RestaurantMemberGuard)
export class RestaurantsController {
  constructor(private readonly service: RestaurantsService) {}

  @Get('current')
  getCurrent(@CurrentRestaurant() restaurant: any) {
    return restaurant;
  }

  @Patch('current')
  @UseGuards(RolesGuard)
  @Roles('owner')
  updateCurrent(@CurrentRestaurant() restaurant: any, @Body() dto: UpdateRestaurantDto) {
    return this.service.updateRestaurant(restaurant.id, dto);
  }

  @Get('current/members')
  @UseGuards(RolesGuard)
  @Roles('owner', 'manager')
  listMembers(@CurrentRestaurant() restaurant: any) {
    return this.service.listMembers(restaurant.id);
  }

  @Delete('current/members/:userId')
  @UseGuards(RolesGuard)
  @Roles('owner')
  removeMember(@CurrentRestaurant() restaurant: any, @Param('userId') userId: string) {
    return this.service.removeMember(restaurant.id, userId);
  }
}

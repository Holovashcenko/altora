import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentRestaurant = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.restaurant;
});

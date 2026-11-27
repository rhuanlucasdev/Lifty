import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import {
  bodyWeightSchema,
  idParamSchema,
  profileSchema,
  type BodyWeightInput,
  type ProfileInput,
} from '@lifty/shared';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  getProfile() {
    return this.users.getProfile();
  }

  @Put('profile')
  updateProfile(@Body({ schema: profileSchema }) body: ProfileInput) {
    return this.users.updateProfile(body);
  }

  @Get('body-weight')
  listBodyWeight() {
    return this.users.listBodyWeight();
  }

  @Post('body-weight')
  addBodyWeight(@Body({ schema: bodyWeightSchema }) body: BodyWeightInput) {
    return this.users.addBodyWeight(body);
  }

  @Delete('body-weight/:id')
  @HttpCode(204)
  deleteBodyWeight(@Param('id', { schema: idParamSchema }) id: number) {
    return this.users.deleteBodyWeight(id);
  }
}

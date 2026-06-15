import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { areAuthGuardsDisabled } from './auth.config';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    if (areAuthGuardsDisabled() && user.id === 'local-dev-admin') {
      const now = new Date();

      return {
        id: user.id,
        name: 'Local Dev Admin',
        email: user.email,
        role: user.role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    const currentUser = await this.usersService.findOne(user.id);

    if (!currentUser.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return currentUser;
  }
}

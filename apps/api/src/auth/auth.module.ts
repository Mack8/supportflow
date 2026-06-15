import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ??
  '1h') as JwtSignOptions['expiresIn'];

if (!jwtSecret) {
  throw new Error('JWT_SECRET is not defined');
}

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtSecret,
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

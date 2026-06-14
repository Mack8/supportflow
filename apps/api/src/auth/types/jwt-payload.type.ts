import type { Role } from '../../../generated/prisma/enums.js';

export type JwtPayload = {
  sub: string;
  id: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
};

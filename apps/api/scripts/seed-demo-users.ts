import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';

type Role = 'USER' | 'AGENT' | 'ADMIN';

const demoUsers = [
  {
    name: 'SupportFlow Admin',
    email: 'admin@supportflow.dev',
    role: 'ADMIN' satisfies Role,
  },
  {
    name: 'SupportFlow Agent',
    email: 'agent@supportflow.dev',
    role: 'AGENT' satisfies Role,
  },
  {
    name: 'SupportFlow User',
    email: 'user@supportflow.dev',
    role: 'USER' satisfies Role,
  },
];

const demoPassword = 'Password123';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString });
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  try {
    for (const user of demoUsers) {
      await pool.query(
        `
          INSERT INTO "User"
            ("id", "name", "email", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
          VALUES
            ($1, $2, $3, $4, $5::"Role", true, NOW(), NOW())
          ON CONFLICT ("email") DO UPDATE SET
            "name" = EXCLUDED."name",
            "passwordHash" = EXCLUDED."passwordHash",
            "role" = EXCLUDED."role",
            "isActive" = true,
            "updatedAt" = NOW()
        `,
        [randomUUID(), user.name, user.email, passwordHash, user.role],
      );
    }

    console.table(
      demoUsers.map((user) => ({
        email: user.email,
        role: user.role,
        password: demoPassword,
      })),
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});

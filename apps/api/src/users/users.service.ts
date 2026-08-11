import type { UserRole } from '@altora/types';
import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Emails are stored and looked up lowercased so logins are case-insensitive. */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: { ...input, email: normalizeEmail(input.email) },
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

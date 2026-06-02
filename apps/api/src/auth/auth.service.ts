import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuthProfile, AuthTokens, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface AuthResult {
  tokens: AuthTokens;
  profile: AuthProfile;
}

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // Stores the signup as a PendingRegistration and emails a confirmation link.
  // No User is created until the link is confirmed.
  async register(dto: RegisterDto): Promise<void> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const name = dto.name?.trim() || null;
    const role = dto.role ?? Role.ATTENDEE;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + CONFIRM_TTL_MS);

    await this.prisma.pendingRegistration.upsert({
      where: { email: dto.email },
      update: { passwordHash, name, role, token, expiresAt },
      create: { email: dto.email, passwordHash, name, role, token, expiresAt },
    });

    const apiBase = this.config
      .get<string>('API_PUBLIC_URL', 'http://localhost:3000')
      .replace(/\/+$/, '');
    const link = `${apiBase}/auth/confirm?token=${token}`;
    await this.mail.sendConfirmation({ to: dto.email, name, link });
  }

  // Confirms a pending registration: creates the User (+ Organizer when the
  // chosen role is ORGANIZER) and returns tokens for the auth cookies.
  // Returns null when the token is unknown or expired.
  async confirmRegistration(token: string): Promise<AuthResult | null> {
    if (!token) return null;
    const pending = await this.prisma.pendingRegistration.findUnique({
      where: { token },
    });
    if (!pending) return null;
    if (pending.expiresAt.getTime() < Date.now()) {
      await this.prisma.pendingRegistration
        .delete({ where: { id: pending.id } })
        .catch(() => undefined);
      return null;
    }

    let user = await this.users.findByEmail(pending.email);
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: pending.email,
          name: pending.name,
          passwordHash: pending.passwordHash,
          role: pending.role,
          emailVerifiedAt: new Date(),
        },
      });
      if (pending.role === Role.ORGANIZER) {
        await this.prisma.organizer.create({
          data: { userId: user.id, name: pending.name || pending.email.split('@')[0] },
        });
      }
    }

    await this.prisma.pendingRegistration
      .delete({ where: { id: pending.id } })
      .catch(() => undefined);

    return this.toResult(user);
  }

  async me(userId: string): Promise<AuthProfile> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.toProfile(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.toResult(user);
  }

  async refresh(payload: JwtPayload): Promise<AuthResult> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.toResult(user);
  }

  private async toResult(user: User): Promise<AuthResult> {
    const tokens = await this.issueTokens(user);
    return { tokens, profile: this.toProfile(user) };
  }

  private toProfile(user: User): AuthProfile {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}

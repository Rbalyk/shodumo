import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CsrfExempt } from '../common/decorators/csrf-exempt.decorator';
import { Public } from '../common/decorators/public.decorator';
import { clearAuthCookies, setAccessCookie, setAuthCookies } from './auth.cookies';
import { AuthService } from './auth.service';
import { AuthProfile, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @CsrfExempt()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start registration — emails a confirmation link' })
  async register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    await this.auth.register(dto);
    return { message: 'Confirmation email sent' };
  }

  @Public()
  @Get('confirm')
  @ApiOperation({ summary: 'Confirm registration, set session cookies, redirect' })
  async confirm(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const web = this.config
      .get<string>('WEB_BASE_URL', 'http://localhost:3001')
      .replace(/\/+$/, '');
    const result = await this.auth.confirmRegistration(token);
    if (!result) {
      res.redirect(HttpStatus.FOUND, `${web}/?confirm=invalid`);
      return;
    }
    setAuthCookies(res, result.tokens, this.config);
    res.redirect(HttpStatus.FOUND, `${web}/?welcome=1`);
  }

  @Public()
  @CsrfExempt()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password (sets cookies)' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthProfile> {
    const { tokens, profile } = await this.auth.login(dto);
    setAuthCookies(res, tokens, this.config);
    return profile;
  }

  @Public()
  @CsrfExempt()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the access cookie using the refresh cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthProfile> {
    const { tokens, profile } = await this.auth.refresh(req.user as JwtPayload);
    setAccessCookie(res, tokens.accessToken, this.config);
    return profile;
  }

  @Public()
  @CsrfExempt()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear session cookies' })
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Current authenticated user profile' })
  me(@CurrentUser('id') userId: string): Promise<AuthProfile> {
    return this.auth.me(userId);
  }
}

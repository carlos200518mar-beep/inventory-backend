import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Si hay un error o no hay usuario, lanzar UnauthorizedException
    if (err || !user) {
      console.error('JWT Auth Error:', { err, user, info });
      throw err || new UnauthorizedException('Token de autenticación inválido o no proporcionado');
    }
    return user;
  }
}

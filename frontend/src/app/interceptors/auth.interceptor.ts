import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

function addTokenHeader(request: HttpRequest<any>, token: string) {
  return request.clone({
    headers: request.headers.set('Authorization', `Bearer ${token}`),
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();

  // Anexa o token de acesso se ele existir
  if (accessToken) {
    req = addTokenHeader(req, accessToken);
  }

  return next(req).pipe(
    catchError((error: any) => {
      // Se o erro for 401 e a URL não for a de login ou refresh...
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('/auth/token/')
      ) {
        // Tenta atualizar o token
        return authService.refreshToken().pipe(
          switchMap((tokens) => {
            // Tenta refazer a requisição original com o novo token
            return next(addTokenHeader(req, tokens.access));
          }),
          catchError((err) => {
            // Se o refresh falhar, o authService já deslogou o usuário.

            return throwError(() => err);
          })
        );
      }

      return throwError(() => error);
    })
  );
};

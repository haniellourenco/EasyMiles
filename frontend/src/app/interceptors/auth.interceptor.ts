// src/app/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Pega o token do localStorage. Usaremos a chave 'auth_token'.
  const authToken = localStorage.getItem('auth_token');

  // Se o token existir, clona a requisição e adiciona o cabeçalho de autorização.
  if (authToken) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`),
    });
    // Passa a requisição CLONADA com o novo cabeçalho para a próxima etapa.
    return next(clonedReq);
  }

  // Se não houver token, simplesmente deixa a requisição original seguir seu caminho.
  return next(req);
};

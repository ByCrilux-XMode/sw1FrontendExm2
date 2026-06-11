import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 0. Si la petición es para la IA, no añadimos el token (evita problemas de CORS innecesarios)
  if (req.url.includes('ngrok-free.dev') || req.url.includes('/api/generate') || req.url.includes('amazonaws.com')) {
    return next(req);
  }

  // 1. Obtenemos el token del localStorage
  const token = localStorage.getItem('token');

  // 2. Si el token existe, clonamos la petición y le añadimos el Header
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  // 3. Si no hay token (ej. en el login), la petición sigue normal
  return next(req);
};
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('empiria_token') : null;
    if (token && !req.headers.has('x-token')) {
      req = req.clone({ setHeaders: { 'x-token': token } });
    }
  } catch {
    // no-op if localStorage not available
  }
  return next(req);
};

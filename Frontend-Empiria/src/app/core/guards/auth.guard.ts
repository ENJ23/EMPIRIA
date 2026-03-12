import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (!isPlatformBrowser(platformId)) {
        return true;
    }

    if (authService.isAuthenticated()) {
        return true;
    }

    const isAdminPath = state.url.startsWith('/admin');
    const loginPath = isAdminPath ? '/admin/login' : '/login';

    return router.createUrlTree([loginPath], {
        queryParams: { redirect: state.url }
    });
};

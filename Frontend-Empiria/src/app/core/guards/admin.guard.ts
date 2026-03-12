import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/admin/login'], {
            queryParams: { redirect: state.url }
        });
    }

    if (!authService.isAdmin()) {
        return router.createUrlTree(['/']);
    }

    return true;
};

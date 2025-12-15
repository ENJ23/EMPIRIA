import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    // Using a Signal for reactive state
    currentUser = signal<{ name: string, role: string } | null>(null);

    constructor(private router: Router) { }

    login(password: string): boolean {
        // Hardcoded mock password for demo
        if (password === 'admin123') {
            this.currentUser.set({ name: 'Admin User', role: 'ADMIN' });
            localStorage.setItem('empiria_user', JSON.stringify({ name: 'Admin User', role: 'ADMIN' }));
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser.set(null);
        localStorage.removeItem('empiria_user');
        this.router.navigate(['/admin/login']);
    }

    isAuthenticated(): boolean {
        // Check signal or local storage persistence
        if (this.currentUser()) return true;

        // Auto-restore session (simplistic approach)
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('empiria_user');
            if (stored) {
                this.currentUser.set(JSON.parse(stored));
                return true;
            }
        }
        return false;
    }
}

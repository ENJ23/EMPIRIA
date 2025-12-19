import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

// TODO: Use environment variable
const API_URL = 'http://localhost:3000/api/auth';

export interface User {
    nombre: string;
    apellido?: string;
    correo: string;
    tipo: 'Admin' | 'Cliente';
    userid: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    currentUser = signal<User | null>(null);

    constructor(private router: Router, private http: HttpClient) {
        this.restoreSession();
    }

    loginManual(correo: string, contrasena: string): Observable<any> {
        return this.http.post(`${API_URL}/login`, { correo, contraseña: contrasena }).pipe(
            tap((res: any) => {
                if (res.status === 1) {
                    this.setSession(res.user, res.token);
                }
            })
        );
    }

    loginGoogle(credential: string): Observable<any> {
        return this.http.post(`${API_URL}/google`, { credential }).pipe(
            tap((res: any) => {
                if (res.status === 1) {
                    this.setSession(res.user, res.token);
                }
            })
        );
    }

    register(userData: any): Observable<any> {
        // Map form 'contrasena' to backend 'contraseña'
        const payload = {
            ...userData,
            contraseña: userData.contrasena
        };

        return this.http.post(`${API_URL}/register`, payload).pipe(
            tap((res: any) => {
                if (res.status === 1) {
                    this.setSession(res.user, res.token);
                }
            })
        );
    }

    logout() {
        this.currentUser.set(null);
        localStorage.removeItem('empiria_user');
        localStorage.removeItem('empiria_token');
        this.router.navigate(['/admin/login']);
    }

    isAuthenticated(): boolean {
        return !!this.currentUser();
    }

    isAdmin(): boolean {
        const user = this.currentUser();
        return user?.tipo === 'Admin';
    }

    getToken(): string | null {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('empiria_token');
        }
        return null;
    }

    private setSession(user: User, token: string) {
        this.currentUser.set(user);
        localStorage.setItem('empiria_user', JSON.stringify(user));
        localStorage.setItem('empiria_token', token);
    }

    private restoreSession() {
        if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('empiria_user');
            if (stored) {
                this.currentUser.set(JSON.parse(stored));
            }
        }
    }
}

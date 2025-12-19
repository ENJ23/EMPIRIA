import { Component, AfterViewInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

declare const google: any;

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewInit {
    loginForm: FormGroup;
    errorMessage = '';
    isRegisterMode = false;

    constructor(
        private formBuilder: FormBuilder,
        private authService: AuthService,
        private router: Router,
        private ngZone: NgZone
    ) {
        this.loginForm = this.formBuilder.group({
            nombre: [''],
            apellido: [''],
            correo: ['', [Validators.required, Validators.email]],
            contrasena: ['', [Validators.required, Validators.minLength(6)]]
        });
    }

    ngAfterViewInit() {
        // Initialize Google Sign-In
        if (typeof google !== 'undefined') {
            google.accounts.id.initialize({
                client_id: '694732029000-ff12fftijqn22d7kiuaicdqs9dvkh98b.apps.googleusercontent.com',
                callback: (response: any) => this.handleGoogleCredential(response)
            });

            google.accounts.id.renderButton(
                document.getElementById("google-btn"),
                { theme: "outline", size: "large", type: "standard", shape: "pill", width: "350" }
            );
        }
    }

    handleGoogleCredential(response: any) {
        this.authService.loginGoogle(response.credential).subscribe({
            next: (res) => {
                this.ngZone.run(() => {
                    this.redirectUser();
                });
            },
            error: (err) => {
                console.error(err);
                this.ngZone.run(() => {
                    this.errorMessage = 'Falló el inicio de sesión con Google';
                });
            }
        });
    }

    toggleMode() {
        this.isRegisterMode = !this.isRegisterMode;
        this.errorMessage = '';

        // Update validators based on mode
        const nombreControl = this.loginForm.get('nombre');
        if (this.isRegisterMode) {
            nombreControl?.setValidators([Validators.required]);
        } else {
            nombreControl?.clearValidators();
        }
        nombreControl?.updateValueAndValidity();
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        if (this.isRegisterMode) {
            this.authService.register(this.loginForm.value).subscribe({
                next: () => this.redirectUser(),
                error: (err) => this.errorMessage = err.error?.msg || 'Error en el registro'
            });
        } else {
            const { correo, contrasena } = this.loginForm.value;
            this.authService.loginManual(correo, contrasena).subscribe({
                next: () => this.redirectUser(),
                error: (err) => this.errorMessage = err.error?.msg || 'Error al iniciar sesión'
            });
        }
    }

    redirectUser() {
        if (this.authService.isAdmin()) {
            this.router.navigate(['/admin/dashboard']);
        } else {
            this.router.navigate(['/']);
        }
    }

    isFieldInvalid(field: string): boolean {
        const control = this.loginForm.get(field);
        return !!(control?.invalid && control?.touched);
    }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css'
})
export class LoginComponent {
    password = '';
    error = '';

    constructor(private authService: AuthService, private router: Router) { }

    onLogin(event: Event) {
        event.preventDefault();
        if (this.authService.login(this.password)) {
            this.router.navigate(['/admin/dashboard']);
        } else {
            this.error = 'Contraseña incorrecta';
        }
    }
}

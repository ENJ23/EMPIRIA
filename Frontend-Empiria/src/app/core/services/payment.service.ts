import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/payments`;

    createPreference(eventId: string, quantity: number, ticketType: string = 'general'): Observable<any> {
        const token = this.authService.getToken();

        return this.http.post(`${this.apiUrl}/create-preference`,
            { eventId, quantity, ticketType },
            { headers: { 'x-token': token || '' } }
        );
    }
}

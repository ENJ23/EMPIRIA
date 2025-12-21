import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = `${environment.apiUrl}/tickets`;

    // New: Public polling by Payment DB id (no JWT required)
    checkTicketStatusByPayment(paymentId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/status`, {
            params: { paymentId }
        });
    }

    // Legacy: Authenticated polling by event (kept for compatibility)
    checkTicketStatus(eventId: string): Observable<any> {
        const token = this.authService.getToken();
        console.log('TicketService: Polling with token:', token ? 'Token exists' : 'Token MISSING');
        return this.http.get(`${this.apiUrl}/status/${eventId}`, {
            headers: { 'x-token': token || '' }
        });
    }

    getTicketById(ticketId: string): Observable<any> {
        const token = this.authService.getToken();
        return this.http.get(`${this.apiUrl}/${ticketId}`, {
            headers: { 'x-token': token || '' }
        });
    }

    // Public endpoint: Get ticket by ID without authentication
    // Used as a fallback when no JWT is available
    getTicketByIdPublic(ticketId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/public/${ticketId}`);
    }

    // Fallback: Get ticket details by Payment ID (no JWT required)
    // Used when JWT fails but we have the payment ID from the purchase
    getTicketByPaymentId(paymentId: string): Observable<any> {
        const url = `${this.apiUrl}/by-payment/${paymentId}`;
        console.log(`[TicketService] Calling: ${url}`);
        return this.http.get(url);
    }
}

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

    checkTicketStatus(eventId: string): Observable<any> {
        const token = this.authService.getToken();
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
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class TicketService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/tickets`;

    checkTicketStatus(eventId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/status/${eventId}`);
    }

    getTicketById(ticketId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${ticketId}`);
    }
}

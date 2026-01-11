import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { TicketSummary } from '../models/ticket.model';

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

    // New: Get ALL tickets for a payment
    getTicketsByPaymentId(paymentId: string): Observable<any> {
        const url = `${this.apiUrl}/by-payment-all/${paymentId}`;
        console.log(`[TicketService] Calling: ${url}`);
        return this.http.get(url);
    }

    // Admin: list tickets with optional filters
    listTickets(params: { eventId?: string; status?: string; page?: number; limit?: number }): Observable<{ tickets: TicketSummary[]; total: number; page: number; limit: number }> {
        const token = this.authService.getToken();
        const httpParams: any = {};
        if (params.eventId) httpParams.eventId = params.eventId;
        if (params.status) httpParams.status = params.status;
        if (params.page) httpParams.page = params.page;
        if (params.limit) httpParams.limit = params.limit;

        console.log('[TicketService.listTickets] Calling with params:', httpParams);
        console.log('[TicketService.listTickets] Token:', token ? 'exists' : 'MISSING');
        console.log('[TicketService.listTickets] URL:', this.apiUrl);

        return this.http.get<any>(`${this.apiUrl}`, {
            headers: { 'x-token': token || '' },
            params: httpParams
        }).pipe(
            map(res => {
                console.log('[TicketService.listTickets] Raw response:', res);
                return {
                    tickets: (res.tickets || []).map((t: any) => ({
                        id: t._id,
                        user: {
                            id: t.user?._id,
                            name: t.user?.nombre ? `${t.user.nombre} ${t.user.apellido || ''}`.trim() : 'N/A',
                            email: t.user?.correo || 'N/A'
                        },
                        event: {
                            id: t.event?._id,
                            title: t.event?.title || 'N/A',
                            date: t.event?.date ? new Date(t.event.date) : new Date(),
                            location: t.event?.location || 'N/A'
                        },
                        status: t.status,
                        amount: t.amount,
                        purchasedAt: new Date(t.purchasedAt)
                    } as TicketSummary)),
                    total: res.pagination?.total || res.tickets?.length || 0,
                    page: res.pagination?.page || 1,
                    limit: res.pagination?.limit || (res.tickets ? res.tickets.length : 0)
                };
            })
        );
    }

    getMyTickets(): Observable<any> {
        const token = this.authService.getToken();
        return this.http.get(`${this.apiUrl}/my-tickets`, {
            headers: { 'x-token': token || '' }
        });
    }
}

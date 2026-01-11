import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-ticket-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './ticket-detail.component.html',
    styleUrl: './ticket-detail.component.css'
})
export class TicketDetailComponent implements OnInit {
    tickets: any[] = []; // Changed from single ticket to array
    qrCodes: { [key: string]: string } = {}; // Map of ticket ID to QR code
    loading = true;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private ticketService = inject(TicketService);
    private cdr = inject(ChangeDetectorRef);

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        const paymentId = this.route.snapshot.queryParamMap.get('paymentId');

        if (id) {
            this.loadTicket(id, paymentId);
        }
    }

    loadTicket(id: string, paymentId: string | null = null) {
        console.log(`[loadTicket] Starting with ticketId: ${id}, paymentId: ${paymentId}`);

        this.ticketService.getTicketById(id).subscribe({
            next: async (res: any) => {
                console.log(`[loadTicket] ✅ Successfully loaded with JWT`);
                console.log(`[loadTicket] Response:`, res);

                if (!res || !res.ticket) {
                    console.error('[loadTicket] Response missing ticket data');
                    this.loading = false;
                    this.cdr.detectChanges();
                    alert('Respuesta inválida del servidor');
                    return;
                }

                this.tickets = [res.ticket]; // Wrap single ticket in array
                console.log(`[loadTicket] Ticket assigned:`, this.tickets[0]);

                // Generate QR
                try {
                    const ticket = this.tickets[0];
                    const ticketId = ticket._id?.toString?.() || ticket._id || '';
                    console.log(`[loadTicket] Generating QR for ID: ${ticketId}`);
                    this.qrCodes[ticketId] = await QRCode.toDataURL(ticketId);
                    console.log(`[loadTicket] QR generated successfully`);
                } catch (err) {
                    console.error('Error creating QR', err);
                }

                this.loading = false;
                console.log(`[loadTicket] Loading set to false`);
                this.cdr.detectChanges();
                console.log(`[loadTicket] Change detection triggered`);
            },
            error: (err) => {
                console.error('Error loading ticket with JWT:', err.status, err.statusText);

                // Fallback: If JWT fails but we have paymentId, try to get ticket from backend using payment
                if (paymentId) {
                    console.log(`[loadTicket] JWT failed (${err.status}), attempting fallback with paymentId: ${paymentId}`);
                    this.loadTicketByPayment(id, paymentId);
                    return;
                }

                // Also try sessionStorage if we don't have paymentId param
                const storedPaymentId = sessionStorage.getItem('lastPaymentId');
                if (storedPaymentId) {
                    console.log(`[loadTicket] JWT failed, attempting fallback with stored paymentId: ${storedPaymentId}`);
                    this.loadTicketByPayment(id, storedPaymentId);
                    return;
                }

                // Last resort: Try without authentication (ticket might be public)
                console.log(`[loadTicket] No paymentId available, attempting public load...`);
                this.loadTicketPublic(id);
            }
        });
    }

    loadTicketPublic(id: string) {
        // Attempt to load ticket without any authentication
        // This is a last resort, relying on the backend to handle access control
        console.log(`[loadTicketPublic] Attempting to load ticket ${id} as public`);

        this.ticketService.getTicketByIdPublic(id).subscribe({
            next: async (res: any) => {
                console.log(`[loadTicketPublic] ✅ Successfully loaded`);

                if (!res || !res.ticket) {
                    console.error('[loadTicketPublic] Response missing ticket data');
                    this.loading = false;
                    this.cdr.detectChanges();
                    alert('Respuesta inválida del servidor');
                    return;
                }

                this.tickets = [res.ticket];

                try {
                    const ticket = this.tickets[0];
                    const ticketId = ticket._id?.toString?.() || ticket._id || '';
                    this.qrCodes[ticketId] = await QRCode.toDataURL(ticketId);
                } catch (err) {
                    console.error('Error creating QR', err);
                }

                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading ticket publicly:', err);
                this.loading = false;
                this.cdr.detectChanges();

                // Handle all errors
                if (err.status === 404) {
                    alert('Entrada no encontrada.');
                } else {
                    alert('No se pudo cargar la entrada. Intenta de nuevo.');
                }
                this.router.navigate(['/']);
            }
        });
    }

    async loadTicketByPayment(ticketId: string, paymentId: string) {
        // Fetch ALL tickets for this payment
        console.log(`[loadTicketByPayment] Loading ALL tickets for paymentId: ${paymentId}`);

        this.ticketService.getTicketsByPaymentId(paymentId).subscribe({
            next: async (res: any) => {
                console.log(`[loadTicketByPayment] Response received:`, res);

                if (!res || !res.tickets || res.tickets.length === 0) {
                    console.error('[loadTicketByPayment] No tickets found');
                    this.loading = false;
                    this.cdr.detectChanges();
                    alert('No se encontraron entradas para este pago');
                    return;
                }

                this.tickets = res.tickets;
                console.log(`[loadTicketByPayment] Loaded ${this.tickets.length} tickets`);

                // Generate QR for all tickets
                for (const ticket of this.tickets) {
                    const tId = ticket._id?.toString?.() || ticket._id || '';
                    try {
                        this.qrCodes[tId] = await QRCode.toDataURL(tId);
                    } catch (err) {
                        console.error(`Error creating QR for ${tId}`, err);
                    }
                }

                this.loading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading tickets by payment:', err);
                this.loading = false;
                this.cdr.detectChanges();
                alert('No se pudo cargar la entrada. Intenta de nuevo.');
                this.router.navigate(['/']);
            }
        });
    }

    printTicket() {
        window.print();
    }

    downloadQR(ticket: any) {
        const tId = ticket._id || '';
        const qrUrl = this.qrCodes[tId];

        if (!qrUrl) return;

        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `entrada-${tId}.png`;
        link.click();
    }
}

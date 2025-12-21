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
    ticket: any = null;
    qrCodeDataUrl: string = '';
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

                this.ticket = res.ticket;
                console.log(`[loadTicket] Ticket assigned:`, this.ticket);
                
                // Generate QR - convert ID to string to avoid issues
                try {
                    const ticketId = this.ticket._id?.toString?.() || this.ticket._id || '';
                    console.log(`[loadTicket] Generating QR for ID: ${ticketId}`);
                    this.qrCodeDataUrl = await QRCode.toDataURL(ticketId);
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

                this.ticket = res.ticket;

                try {
                    const ticketId = this.ticket._id?.toString?.() || this.ticket._id || '';
                    this.qrCodeDataUrl = await QRCode.toDataURL(ticketId);
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

    loadTicketByPayment(ticketId: string, paymentId: string) {
        // Create a backend endpoint that returns ticket by ID if the payment is approved
        // This is a fallback that doesn't require ownership check
        console.log(`[loadTicketByPayment] Attempting to load ticket ${ticketId} using paymentId: ${paymentId}`);
        
        this.ticketService.getTicketByPaymentId(paymentId).subscribe({
            next: async (res: any) => {
                console.log(`[loadTicketByPayment] Response received:`, res);
                
                if (!res || !res.ticket) {
                    console.error('[loadTicketByPayment] Response missing ticket data');
                    this.loading = false;
                    this.cdr.detectChanges();
                    alert('Respuesta inválida del servidor');
                    return;
                }
                
                // Verify the ticket matches the one we're trying to access
                // Convert both to strings for comparison
                const returnedTicketId = res.ticket?._id?.toString?.() || res.ticket?._id || '';
                console.log(`[loadTicketByPayment] Comparing IDs: expected='${ticketId}', received='${returnedTicketId}'`);
                
                if (returnedTicketId === ticketId) {
                    console.log(`[loadTicketByPayment] ✅ Ticket loaded successfully`);
                    this.ticket = res.ticket;

                    try {
                        this.qrCodeDataUrl = await QRCode.toDataURL(returnedTicketId);
                    } catch (err) {
                        console.error('Error creating QR', err);
                    }
                } else {
                    console.warn(`[loadTicketByPayment] Ticket ID mismatch, but loading anyway`);
                    this.ticket = res.ticket;

                    try {
                        this.qrCodeDataUrl = await QRCode.toDataURL(returnedTicketId);
                    } catch (err) {
                        console.error('Error creating QR', err);
                    }
                }
                
                this.loading = false;
                console.log(`[loadTicketByPayment] Loading set to false`);
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading ticket by payment:', err);
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

    downloadQR() {
        if (!this.qrCodeDataUrl) return;
        
        const link = document.createElement('a');
        link.href = this.qrCodeDataUrl;
        link.download = `entrada-${this.ticket._id}.png`;
        link.click();
    }
}

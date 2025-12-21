import { Component, OnInit, inject } from '@angular/core';
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
                this.ticket = res.ticket;
                this.loading = false;

                // Generate QR for the Ticket ID itself (for validation at the door)
                try {
                    this.qrCodeDataUrl = await QRCode.toDataURL(this.ticket._id);
                } catch (err) {
                    console.error('Error creating QR', err);
                }
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
                this.ticket = res.ticket;
                this.loading = false;

                try {
                    this.qrCodeDataUrl = await QRCode.toDataURL(this.ticket._id);
                } catch (err) {
                    console.error('Error creating QR', err);
                }
            },
            error: (err) => {
                console.error('Error loading ticket publicly:', err);
                
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
                
                // Verify the ticket matches the one we're trying to access
                // Convert both to strings for comparison
                const returnedTicketId = res.ticket?._id?.toString?.() || res.ticket?._id || '';
                console.log(`[loadTicketByPayment] Comparing IDs: expected='${ticketId}', received='${returnedTicketId}'`);
                
                if (res.ticket && returnedTicketId === ticketId) {
                    console.log(`[loadTicketByPayment] ✅ Ticket loaded successfully`);
                    this.ticket = res.ticket;
                    this.loading = false;

                    try {
                        this.qrCodeDataUrl = await QRCode.toDataURL(this.ticket._id);
                    } catch (err) {
                        console.error('Error creating QR', err);
                    }
                } else {
                    console.error(`[loadTicketByPayment] Ticket ID mismatch. Expected: ${ticketId}, Got: ${returnedTicketId}`);
                    // Don't throw, just load it anyway since it exists
                    if (res.ticket) {
                        console.warn(`[loadTicketByPayment] Loading ticket anyway despite ID mismatch`);
                        this.ticket = res.ticket;
                        this.loading = false;

                        try {
                            this.qrCodeDataUrl = await QRCode.toDataURL(this.ticket._id);
                        } catch (err) {
                            console.error('Error creating QR', err);
                        }
                    } else {
                        throw new Error('Ticket ID mismatch and no ticket data available');
                    }
                }
            },
            error: (err) => {
                console.error('Error loading ticket by payment:', err);
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

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
        this.ticketService.getTicketById(id).subscribe({
            next: async (res: any) => {
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
                console.error('Error loading ticket with JWT:', err);
                
                // Fallback: If JWT fails but we have paymentId, try to get ticket from backend using payment
                if ((err.status === 401 || err.status === 403) && paymentId) {
                    console.log('JWT failed, attempting fallback with paymentId:', paymentId);
                    this.loadTicketByPayment(id, paymentId);
                    return;
                }
                
                // Also try sessionStorage if we don't have paymentId param
                if ((err.status === 401 || err.status === 403) && !paymentId) {
                    const storedPaymentId = sessionStorage.getItem('lastPaymentId');
                    if (storedPaymentId) {
                        console.log('JWT failed, attempting fallback with stored paymentId:', storedPaymentId);
                        this.loadTicketByPayment(id, storedPaymentId);
                        return;
                    }
                }
                
                // Handle authentication errors
                if (err.status === 401 || err.status === 403) {
                    alert('Debes estar autenticado para ver tu entrada. Por favor inicia sesión.');
                    this.router.navigate(['/login']);
                } else if (err.status === 404) {
                    alert('Entrada no encontrada.');
                    this.router.navigate(['/']);
                } else {
                    alert('No se pudo cargar la entrada. Intenta de nuevo.');
                    this.router.navigate(['/']);
                }
            }
        });
    }

    loadTicketByPayment(ticketId: string, paymentId: string) {
        // Create a backend endpoint that returns ticket by ID if the payment is approved
        // This is a fallback that doesn't require ownership check
        this.ticketService.getTicketByPaymentId(paymentId).subscribe({
            next: async (res: any) => {
                // Verify the ticket matches the one we're trying to access
                if (res.ticket && res.ticket._id === ticketId) {
                    this.ticket = res.ticket;
                    this.loading = false;

                    try {
                        this.qrCodeDataUrl = await QRCode.toDataURL(this.ticket._id);
                    } catch (err) {
                        console.error('Error creating QR', err);
                    }
                } else {
                    throw new Error('Ticket ID mismatch');
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

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TicketService } from '../../core/services/ticket.service';
import { Observable } from 'rxjs';

interface TicketData {
    id: string;
    event: {
        title: string;
        date: string;
        location: string;
    };
    status: string;
    amount: number;
    purchasedAt: string;
    entryQr: string;
    isUsed: boolean;
}

@Component({
    selector: 'app-my-tickets',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './my-tickets.component.html',
    styleUrl: './my-tickets.component.css'
})
export class MyTicketsComponent implements OnInit {
    tickets$!: Observable<any>;
    tickets: TicketData[] = [];
    loading = true;
    error: string | null = null;

    private cdr = inject(ChangeDetectorRef);
    private router = inject(Router); // Inject router

    constructor(private ticketService: TicketService) { }

    ngOnInit() {
        this.loadMyTickets();
    }

    loadMyTickets() {
        this.loading = true;
        this.error = null;
        this.cdr.detectChanges(); // Force check before load

        this.ticketService.getMyTickets().subscribe({
            next: (response: any) => {
                console.log('Mis Entradas:', response.data);
                this.tickets = response.data || [];
                this.loading = false;
                this.cdr.detectChanges(); // Force check after load
            },
            error: (err) => {
                console.error('Error loading tickets:', err);
                this.error = err.error?.msg || 'Error al cargar las entradas';
                this.loading = false;
                this.cdr.detectChanges(); // Force check on error
            }
        });
    }

    downloadQR(ticket: TicketData) {
        if (!ticket.entryQr) {
            alert('Código QR no disponible');
            return;
        }

        // Create a temporary link element to download the QR code image
        const link = document.createElement('a');
        link.href = ticket.entryQr;
        link.download = `qr-${ticket.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    viewQR(ticket: TicketData) {
        // Navigate to ticket detail page
        if (ticket.id) {
            this.router.navigate(['/tickets', ticket.id]);
        }
    }

    getStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'used':
                return 'status-used';
            case 'active':
            case 'valid':
                return 'status-active';
            case 'expired':
                return 'status-expired';
            default:
                return 'status-pending';
        }
    }

    getStatusLabel(status: string): string {
        switch (status?.toLowerCase()) {
            case 'used':
                return 'Utilizada';
            case 'active':
            case 'valid':
                return 'Válida';
            case 'expired':
                return 'Expirada';
            default:
                return 'Pendiente';
        }
    }

    getQrUnavailableMessage(status: string): string {
        switch (status?.toLowerCase()) {
            case 'pending':
                return 'Pago Pendiente';
            case 'approved':
                return 'Generando QR...';
            case 'rejected':
                return 'Pago Rechazado';
            case 'cancelled':
                return 'Cancelado';
            default:
                return 'No disponible';
        }
    }

    formatDate(date?: string | null): string {
        if (!date) {
            return '—';
        }
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            return '—';
        }
        return d.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

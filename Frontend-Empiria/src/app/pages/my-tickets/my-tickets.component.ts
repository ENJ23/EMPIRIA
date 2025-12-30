import { Component, OnInit } from '@angular/core';
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

    constructor(private ticketService: TicketService) { }

    ngOnInit() {
        this.loadMyTickets();
    }

    loadMyTickets() {
        this.loading = true;
        this.error = null;
        this.ticketService.getMyTickets().subscribe({
            next: (response: any) => {
                this.tickets = response.data || [];
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading tickets:', err);
                this.error = err.error?.msg || 'Error al cargar las entradas';
                this.loading = false;
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
        // Open QR in a modal or new window
        if (ticket.entryQr) {
            window.open(ticket.entryQr, '_blank');
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

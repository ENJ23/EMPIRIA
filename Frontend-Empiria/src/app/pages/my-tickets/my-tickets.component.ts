import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../core/services/ticket.service';
import { Observable } from 'rxjs';

interface TicketData {
    id: string;
    event: {
        _id: string;
        title: string;
        date: string;
        location: string;
        imageUrl?: string;
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
    imports: [CommonModule, FormsModule], // Added FormsModule
    templateUrl: './my-tickets.component.html',
    styleUrl: './my-tickets.component.css'
})
export class MyTicketsComponent implements OnInit {
    tickets$!: Observable<any>;
    tickets: TicketData[] = [];
    loading = true;
    error = '';

    // Pagination & Filtering
    filteredTickets: TicketData[] = [];
    displayedTickets: TicketData[] = [];
    uniqueEvents: any[] = [];
    selectedEventId: string = 'all';

    currentPage = 1;
    pageSize = 5;
    totalPages = 1;

    constructor(
        private ticketService: TicketService,
        private router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.loadMyTickets();
    }

    loadMyTickets() {
        this.loading = true;
        this.error = '';

        this.ticketService.getMyTickets().subscribe({
            next: (res: any) => {
                this.tickets = res.data || [];

                // Extract unique events for filter
                const eventsMap = new Map();
                this.tickets.forEach(ticket => {
                    if (ticket.event && !eventsMap.has(ticket.event._id)) {
                        eventsMap.set(ticket.event._id, ticket.event);
                    }
                });
                this.uniqueEvents = Array.from(eventsMap.values());

                // Initialize view
                this.filterTickets();
                this.loading = false;
                this.cdr.markForCheck(); // Use markForCheck instead of detectChanges for safety
            },
            error: (err) => {
                console.error('Error loading tickets:', err);
                this.error = err.error?.msg || 'Error al cargar las entradas';
                this.loading = false;
                this.cdr.markForCheck();
            }
        });
    }

    downloadQR(ticket: any) {
        if (!ticket.entryQr) {
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

    viewQR(ticket: any) {
        // Redirigir al detalle de la entrada
        this.router.navigate(['/tickets', ticket.id]);
    }

    filterTickets() {
        if (this.selectedEventId === 'all') {
            this.filteredTickets = [...this.tickets];
        } else {
            this.filteredTickets = this.tickets.filter(t => t.event && t.event._id === this.selectedEventId);
        }
        this.currentPage = 1;
        this.updatePagination();
    }

    updatePagination() {
        this.totalPages = Math.ceil(this.filteredTickets.length / this.pageSize);

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;

        this.displayedTickets = this.filteredTickets.slice(startIndex, endIndex);
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
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

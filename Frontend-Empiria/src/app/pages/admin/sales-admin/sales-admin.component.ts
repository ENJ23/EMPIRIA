import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { Observable } from 'rxjs';
import { Event } from '../../../core/models/event.model';
import { TicketService } from '../../../core/services/ticket.service';
import { TicketSummary } from '../../../core/models/ticket.model';

@Component({
    selector: 'app-sales-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './sales-admin.component.html',
    styleUrl: './sales-admin.component.css'
})
export class SalesAdminComponent implements OnInit {
    events$!: Observable<Event[]>;
    tickets: TicketSummary[] = [];
    allTickets: TicketSummary[] = [];
    selectedEventId: string = '';
    loading = false;
    totalAmount = 0;
    totalTickets = 0;

    private cdr = inject(ChangeDetectorRef);

    constructor(private eventService: EventService, private ticketService: TicketService) { }

    ngOnInit() {
        this.events$ = this.eventService.getEvents();
        this.fetchAllTickets();
    }

    fetchAllTickets() {
        this.loading = true;
        this.cdr.detectChanges(); // Force check before load
        console.log('[SalesAdmin] Fetching all tickets');
        this.ticketService.listTickets({ limit: 1000 }).subscribe({
            next: (res) => {
                console.log('[SalesAdmin] Received tickets:', res);
                console.log('[SalesAdmin] Number of tickets:', res.tickets.length);
                this.allTickets = res.tickets;
                this.applyFilter();
                this.loading = false;
                console.log('[SalesAdmin] Loading complete. Tickets in view:', this.tickets.length);
                this.cdr.detectChanges(); // Force check after load
            },
            error: (err) => {
                console.error('[SalesAdmin] Error loading tickets:', err);
                this.loading = false;
                this.cdr.detectChanges(); // Force check on error
            }
        });
    }

    onEventFilterChange(value: string) {
        console.log('[SalesAdmin] onEventFilterChange:', value);
        this.selectedEventId = value || '';
        // Apply local filter instantly for snappy UI
        this.applyFilter();
    }

    private applyFilter() {
        if (!this.selectedEventId) {
            this.tickets = this.allTickets;
        } else {
            this.tickets = this.allTickets.filter(t => t.event.id === this.selectedEventId);
        }
        this.totalTickets = this.tickets.length;
        this.totalAmount = this.tickets.reduce((sum, t) => sum + (t.amount || 0), 0);
        console.log('[SalesAdmin] Applied filter. Event:', this.selectedEventId, 'Count:', this.totalTickets);
    }

    trackById(index: number, t: TicketSummary) { return t.id; }

    async exportExcel() {
        const xlsx = await import('xlsx');
        const rows = this.tickets.map(t => ({
            Cliente: t.user.name,
            Email: t.user.email,
            Evento: t.event.title,
            Fecha: new Date(t.purchasedAt).toLocaleString(),
            Monto: t.amount,
            Estado: t.status
        }));
        const ws = xlsx.utils.json_to_sheet(rows);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Tickets');
        xlsx.writeFile(wb, 'tickets.xlsx');
    }

    async exportPdf() {
        const jsPDF = (await import('jspdf')).default;
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF();
        const head = [['Cliente', 'Email', 'Evento', 'Fecha', 'Monto', 'Estado']];
        const body = this.tickets.map(t => [
            t.user.name || '',
            t.user.email || '',
            t.event.title || '',
            new Date(t.purchasedAt).toLocaleString(),
            String(t.amount || 0),
            t.status
        ]);
        autoTable(doc, { head, body });
        doc.save('tickets.pdf');
    }
}

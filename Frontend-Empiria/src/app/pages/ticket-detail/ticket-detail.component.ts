import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-ticket-detail',
    standalone: true,
    imports: [CommonModule],
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
        if (id) {
            this.loadTicket(id);
        }
    }

    loadTicket(id: string) {
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
                console.error('Error loading ticket', err);
                alert('No se pudo cargar el ticket. Verifique permisos.');
                this.router.navigate(['/']);
            }
        });
    }

    printTicket() {
        window.print();
    }
}

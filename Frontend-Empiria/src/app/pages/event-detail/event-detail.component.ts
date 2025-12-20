import { Component, OnInit, inject, ChangeDetectorRef, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { PaymentService } from '../../core/services/payment.service';
import { TicketService } from '../../core/services/ticket.service';
import { Event } from '../../core/models/event.model';
import { Observable, switchMap, tap } from 'rxjs';
import * as QRCode from 'qrcode';

@Component({
    selector: 'app-event-detail',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './event-detail.component.html',
    styleUrl: './event-detail.component.css'
})
export class EventDetailComponent implements OnInit, OnDestroy {
    event$!: Observable<Event | undefined>;
    selectedTicket: string | null = null;
    currentPrice: number = 0;
    eventId: string | null = null;

    // Payment State
    showPaymentModal = false;
    paymentUrl = '';
    qrCodeUrl = '';
    isProcessing = false;

    private pollingInterval: any;

    private paymentService = inject(PaymentService);
    private ticketService = inject(TicketService);
    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);
    private router = inject(Router);

    constructor(
        private route: ActivatedRoute,
        private eventService: EventService
    ) { }

    ngOnInit() {
        this.event$ = this.route.paramMap.pipe(
            tap(params => this.eventId = params.get('id')),
            switchMap(params => {
                const id = params.get('id');
                return this.eventService.getEventById(id!);
            })
        );
    }

    ngOnDestroy() {
        this.stopPolling();
    }

    selectTicket(type: string, price: number) {
        this.selectedTicket = type;
        this.currentPrice = price;
    }

    purchase() {
        if (!this.selectedTicket || !this.eventId) return;

        this.isProcessing = true;
        const quantity = 1;

        this.paymentService.createPreference(this.eventId, quantity).subscribe({
            next: (res: any) => {
                this.paymentUrl = res.init_point;
                // Generate QR, then force update inside Zone
                QRCode.toDataURL(this.paymentUrl)
                    .then(url => {
                        this.ngZone.run(() => {
                            this.qrCodeUrl = url;
                            this.showPaymentModal = true;
                            this.isProcessing = false;
                            this.startPolling(this.eventId!); // Start listening for payment
                            this.cdr.detectChanges();
                        });
                    })
                    .catch(err => {
                        this.ngZone.run(() => {
                            console.error('Error generando QR', err);
                            this.isProcessing = false;
                            this.cdr.detectChanges();
                        });
                    });
            },
            error: (err) => {
                console.error(err);
                alert('Hubo un error al iniciar el pago. ¿Estás logueado?');
                this.ngZone.run(() => {
                    this.isProcessing = false;
                    this.cdr.detectChanges();
                });
            }
        });
    }

    startPolling(eventId: string) {
        this.stopPolling(); // Clear any existing interval

        console.log('Iniciando búsqueda de ticket...');
        this.pollingInterval = setInterval(() => {
            this.ticketService.checkTicketStatus(eventId).subscribe({
                next: (res: any) => {
                    if (res && res.hasTicket && res.ticketId) {
                        console.log('¡Ticket confirmado!', res.ticketId);
                        this.stopPolling();
                        this.closeModal();

                        this.ngZone.run(() => {
                            this.router.navigate(['/tickets', res.ticketId]);
                        });
                    }
                },
                error: (err) => {
                    // Silent error, keep polling
                    console.warn('Polling error', err);
                }
            });
        }, 3000); // Check every 3 seconds
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    closeModal() {
        this.showPaymentModal = false;
        this.stopPolling(); // Stop checking if user manually closes modal
    }
}

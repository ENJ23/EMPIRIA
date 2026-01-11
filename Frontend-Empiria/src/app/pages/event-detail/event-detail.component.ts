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
    selectedQuantity: number = 1;
    eventId: string | null = null;

    // Ticket availability
    availableTickets: number = 0;
    isSoldOut: boolean = false;

    // Payment State
    showPaymentModal = false;
    paymentUrl = '';
    qrCodeUrl = '';
    isProcessing = false;
    private paymentDbId: string | null = null; // Payment _id returned by backend

    // UI Error State for purchase
    purchaseErrorMsg: string | null = null;
    purchaseErrorDetails: { available?: number; requested?: number; soldOut?: boolean } = {};

    private pollingInterval: any;
    private pollingStartTime: number = 0;
    private maxPollingDuration: number = 300000; // 5 minutes in milliseconds

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
            }),
            tap((event: any) => {
                // Calculate available tickets
                if (event) {
                    const ticketsSold = event.ticketsSold || 0;
                    this.availableTickets = event.capacity - ticketsSold;
                    this.isSoldOut = this.availableTickets <= 0;
                    console.log(`📊 Event capacity: ${event.capacity}, Sold: ${ticketsSold}, Available: ${this.availableTickets}`);
                }
            })
        );
    }

    ngOnDestroy() {
        this.stopPolling();
    }

    selectTicket(type: string, price: number) {
        // Prevent selection if sold out
        if (this.isSoldOut) return;
        this.selectedTicket = type;
        this.currentPrice = price;
        // Reset any previous purchase error when user changes selection
        this.purchaseErrorMsg = null;
        this.purchaseErrorDetails = {};
    }

    setQuantity(q: number) {
        const maxQ = Math.max(1, this.availableTickets || 1);
        this.selectedQuantity = Math.max(1, Math.min(Math.floor(q) || 1, maxQ));
    }

    incrementQuantity() {
        if (!this.isSoldOut && this.selectedQuantity < this.availableTickets) {
            this.setQuantity(this.selectedQuantity + 1);
        }
    }

    decrementQuantity() {
        if (this.selectedQuantity > 1) {
            this.setQuantity(this.selectedQuantity - 1);
        }
    }

    purchase() {
        if (!this.eventId) return;

        this.isProcessing = true;
        const quantity = Math.max(1, Math.min(this.selectedQuantity || 1, this.availableTickets || 1));

        // ✅ NUEVO: Detectar si es evento gratuito
        this.event$.subscribe((event: any) => {
            if (event?.isFree) {
                // Solicitar entradas gratuitas sin pago
                this.paymentService.requestFreeTickets(this.eventId!, quantity).subscribe({
                    next: (res: any) => {
                        this.purchaseErrorMsg = null;
                        this.purchaseErrorDetails = {};
                        // Mostrar mensaje de éxito
                        alert(`✅ Entradas solicitadas exitosamente! Puedes verlas en "Mis Entradas"`);
                        this.isProcessing = false;
                        this.selectedTicket = null;
                        this.selectedQuantity = 1;
                        this.cdr.detectChanges();
                    },
                    error: (err) => {
                        console.error('Error al solicitar entradas gratuitas:', err);
                        const serverError = err?.error;
                        let msg = 'No se pudo solicitar las entradas.';
                        if (serverError?.msg) {
                            msg = serverError.msg;
                        }
                        this.purchaseErrorMsg = msg;
                        this.isProcessing = false;
                        this.cdr.detectChanges();
                    }
                });
            } else {
                // Flujo normal de pago
                const ticketType = this.selectedTicket || 'general';
                this.paymentService.createPreference(this.eventId!, quantity, ticketType).subscribe({
                    next: (res: any) => {
                        // Clear any prior errors on success
                        this.purchaseErrorMsg = null;
                        this.purchaseErrorDetails = {};
                        this.paymentUrl = res.init_point;
                        this.paymentDbId = res.payment_id || null;
                        // Generate QR, then force update inside Zone
                        QRCode.toDataURL(this.paymentUrl)
                            .then(url => {
                                this.ngZone.run(() => {
                                    this.qrCodeUrl = url;
                                    this.showPaymentModal = true;
                                    this.isProcessing = false;
                                    // Prefer polling by Payment ID (does not require JWT)
                                    if (this.paymentDbId) {
                                        this.startPollingByPayment(this.paymentDbId);
                                    } else if (this.eventId) {
                                        // Fallback to legacy polling by event (requires JWT)
                                        this.startPolling(this.eventId);
                                    }
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
                        console.error('Error al iniciar el pago:', err);
                        // Parse backend-provided error details for a friendly UI message
                        const serverError = err?.error;
                        let msg = 'No se pudo iniciar el pago.';
                        const details: { available?: number; requested?: number; soldOut?: boolean } = {};
                        if (serverError && typeof serverError === 'object') {
                            if (serverError.msg) msg = serverError.msg;
                            if (typeof serverError.available === 'number') details.available = serverError.available;
                            if (typeof serverError.requested === 'number') details.requested = serverError.requested;
                            if (typeof serverError.soldOut === 'boolean') details.soldOut = serverError.soldOut;
                        } else if (typeof serverError === 'string') {
                            msg = serverError;
                        }
                        this.purchaseErrorMsg = msg;
                        this.purchaseErrorDetails = details;
                        this.ngZone.run(() => {
                            this.isProcessing = false;
                            this.cdr.detectChanges();
                        });
                    }
                });
            }
        });
    }

    startPolling(eventId: string) {
        this.stopPolling(); // Clear any existing interval

        this.pollingStartTime = Date.now();
        console.log('🔄 Iniciando búsqueda de ticket...');
        this.pollingInterval = setInterval(() => {
            // Check if we've exceeded the maximum polling duration
            const elapsedTime = Date.now() - this.pollingStartTime;
            if (elapsedTime > this.maxPollingDuration) {
                console.error('❌ Polling timeout - Máximo tiempo de espera alcanzado');
                this.stopPolling();
                this.closeModal();
                alert('El tiempo de espera para confirmar el pago ha expirado. Por favor, verifica tu estado de pago.');
                return;
            }

            this.ticketService.checkTicketStatus(eventId).subscribe({
                next: (res: any) => {
                    if (res && res.hasTicket && res.ticketId) {
                        console.log('✅ ¡Ticket confirmado!', res.ticketId);
                        this.stopPolling();
                        this.closeModal();

                        // Store payment_id in sessionStorage for ticket-detail component to use as fallback
                        if (this.paymentDbId) {
                            sessionStorage.setItem('lastPaymentId', this.paymentDbId);
                        }

                        this.ngZone.run(() => {
                            this.router.navigate(['/tickets', res.ticketId], {
                                queryParams: { paymentId: this.paymentDbId }
                            });
                        });
                    }
                },
                error: (err) => {
                    // Silent error, keep polling
                    console.warn('⚠️ Polling error', err);
                }
            });
        }, 5000); // Check every 5 seconds (increased from 3 to avoid overwhelming the server)
    }

    startPollingByPayment(paymentId: string) {
        this.stopPolling();
        this.pollingStartTime = Date.now();
        console.log('🔄 Iniciando búsqueda de ticket por Payment ID...');
        this.pollingInterval = setInterval(() => {
            const elapsedTime = Date.now() - this.pollingStartTime;
            if (elapsedTime > this.maxPollingDuration) {
                console.error('❌ Polling timeout - Máximo tiempo de espera alcanzado');
                this.stopPolling();
                this.closeModal();
                alert('El tiempo de espera para confirmar el pago ha expirado. Por favor, verifica tu estado de pago.');
                return;
            }

            this.ticketService.checkTicketStatusByPayment(paymentId).subscribe({
                next: (res: any) => {
                    if (res && res.hasTicket && res.ticketId) {
                        console.log('✅ ¡Ticket confirmado!', res.ticketId);
                        this.stopPolling();
                        this.closeModal();

                        // Store payment_id in sessionStorage for ticket-detail component to use as fallback
                        sessionStorage.setItem('lastPaymentId', paymentId);

                        this.ngZone.run(() => {
                            this.router.navigate(['/tickets', res.ticketId], {
                                queryParams: { paymentId: paymentId }
                            });
                        });
                    }
                },
                error: (err) => {
                    console.warn('⚠️ Polling error (paymentId)', err);
                }
            });
        }, 5000);
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

import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../core/services/payment.service';
import { Subject, interval, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as QRCode from 'qrcode';

interface PaymentData {
    id: string;
    event: {
        title: string;
        date: string;
        location: string;
    };
    quantity: number;
    ticketType: string;
    mp_payment_id: string;
    amount: number;
    transaction_amount?: number;
    status: string; // 'pending', 'approved', 'rejected', 'cancelled'
    createdAt: string;
    updatedAt: string;

    // Reservation info for QR re-access
    isReserved: boolean;
    reservationConfirmed: boolean;
    reservedUntil: string | null;
    isReservationActive: boolean;
    timeRemainingMinutes: number;

    // Mercado Pago link
    canAccessQR: boolean;
    mp_init_point: string | null;
}

@Component({
    selector: 'app-my-payments',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './my-payments.component.html',
    styleUrl: './my-payments.component.css'
})
export class MyPaymentsComponent implements OnInit, OnDestroy {
    payments: PaymentData[] = [];
    loading = true;
    error: string | null = null;

    private destroy$ = new Subject<void>();
    private timerSubscription: Subscription | null = null;

    // Modal State
    showPaymentModal = false;
    selectedPaymentQr: string | null = null;
    selectedPaymentLink: string | null = null;
    selectedPayment: PaymentData | null = null;

    private cdr = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone);

    constructor(private paymentService: PaymentService) { }

    ngOnInit() {
        this.loadMyPayments();
        // Refresh payments every 30 seconds to update countdown timers
        this.timerSubscription = interval(30000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.loadMyPayments());
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }
    }

    loadMyPayments() {
        this.loading = true;
        this.error = null;
        this.cdr.detectChanges(); // Force check

        this.paymentService.getMyPayments().subscribe({
            next: (response: any) => {
                this.payments = response.data || [];
                this.loading = false;
                this.cdr.detectChanges(); // Force check
            },
            error: (err) => {
                console.error('Error loading payments:', err);
                this.error = err.error?.msg || 'Error al cargar los pagos';
                this.loading = false;
                this.cdr.detectChanges(); // Force check
            }
        });
    }

    openPaymentModal(payment: PaymentData) {
        if (!payment.mp_init_point) {
            alert('Enlace de pago no disponible');
            return;
        }

        this.selectedPayment = payment;
        this.selectedPaymentLink = payment.mp_init_point;

        // Generate QR on the fly
        QRCode.toDataURL(this.selectedPaymentLink)
            .then(url => {
                this.ngZone.run(() => {
                    this.selectedPaymentQr = url;
                    this.showPaymentModal = true;
                    this.cdr.detectChanges();
                });
            })
            .catch(err => {
                console.error('Error generating QR', err);
                this.ngZone.run(() => {
                    alert('Error al generar el código QR');
                });
            });
    }

    closePaymentModal() {
        this.showPaymentModal = false;
        this.selectedPayment = null;
        this.selectedPaymentQr = null;
        this.selectedPaymentLink = null;
    }

    getStatusClass(status: string): string {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'status-approved';
            case 'pending':
                return 'status-pending';
            case 'rejected':
            case 'cancelled':
                return 'status-rejected';
            default:
                return 'status-pending';
        }
    }

    getStatusLabel(status: string): string {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'Aprobado';
            case 'pending':
                return 'Pendiente';
            case 'rejected':
                return 'Rechazado';
            case 'cancelled':
                return 'Cancelado';
            default:
                return 'Desconocido';
        }
    }

    getStatusIcon(status: string): string {
        switch (status?.toLowerCase()) {
            case 'approved':
                return 'check_circle';
            case 'pending':
                return 'schedule';
            case 'rejected':
                return 'cancel';
            case 'cancelled':
                return 'block';
            default:
                return 'help_outline';
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

    getTimeRemainingLabel(payment: PaymentData): string {
        if (!payment.isReservationActive) {
            return 'Reserva expirada';
        }
        const minutes = payment.timeRemainingMinutes;
        if (minutes > 1) {
            return `${minutes} minutos restantes`;
        } else if (minutes === 1) {
            return '1 minuto restante';
        } else {
            return 'Expirando pronto';
        }
    }
}

import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { PaymentService } from '../../core/services/payment.service';
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
export class EventDetailComponent implements OnInit {
    event$!: Observable<Event | undefined>;
    selectedTicket: string | null = null;
    currentPrice: number = 0;
    eventId: string | null = null;

    // Payment State
    showPaymentModal = false;
    paymentUrl = '';
    qrCodeUrl = '';
    isProcessing = false;

    private paymentService = inject(PaymentService);
    private cdr = inject(ChangeDetectorRef);

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

    selectTicket(type: string, price: number) {
        this.selectedTicket = type;
        this.currentPrice = price;
    }

    purchase() {
        if (!this.selectedTicket || !this.eventId) return;

        this.isProcessing = true;
        const quantity = 1; // Simplificado por ahora

        this.paymentService.createPreference(this.eventId, quantity).subscribe({
            next: async (res: any) => {
                this.paymentUrl = res.init_point;
                try {
                    this.qrCodeUrl = await QRCode.toDataURL(this.paymentUrl);
                    this.showPaymentModal = true;
                    this.isProcessing = false;
                    this.cdr.detectChanges(); // Force UI update
                } catch (err) {
                    console.error('Error generando QR', err);
                    this.isProcessing = false;
                    this.cdr.detectChanges();
                }
            },
            error: (err) => {
                console.error(err);
                alert('Hubo un error al iniciar el pago. ¿Estás logueado?');
                this.isProcessing = false;
                this.cdr.detectChanges();
            }
        });
    }

    closeModal() {
        this.showPaymentModal = false;
    }
}

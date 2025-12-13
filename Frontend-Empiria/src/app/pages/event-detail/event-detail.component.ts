import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';
import { Observable, switchMap } from 'rxjs';

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

    constructor(
        private route: ActivatedRoute,
        private eventService: EventService
    ) { }

    ngOnInit() {
        this.event$ = this.route.paramMap.pipe(
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
        if (confirm(`¿Confirmar compra de entrada ${this.selectedTicket} por $${this.currentPrice}?`)) {
            alert('¡Compra realizada con éxito! Descargando comprobante...');
            // Here would be the logic to download PDF or QR
        }
    }
}

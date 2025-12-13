import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';
import { Observable, map } from 'rxjs';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';

@Component({
    selector: 'app-promotions',
    standalone: true,
    imports: [CommonModule, EventCardComponent],
    templateUrl: './promotions.component.html',
    styleUrl: './promotions.component.css'
})
export class PromotionsComponent implements OnInit {
    promoEvents$!: Observable<Event[]>;

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.promoEvents$ = this.eventService.getEvents().pipe(
            map(events => events.filter(e => e.isPreventa || e.priceRange.min === 0))
        );
    }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';
import { Observable, finalize } from 'rxjs';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';

@Component({
    selector: 'app-events-list',
    standalone: true,
    imports: [CommonModule, FormsModule, EventCardComponent],
    templateUrl: './events-list.component.html',
    styleUrl: './events-list.component.css'
})
export class EventsListComponent implements OnInit {
    events$!: Observable<Event[]>;
    isLoading = false;

    filters = {
        category: '',
        dateFrom: '',
        dateTo: '',
        priceMax: '',
        sortBy: 'date'
    };

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.loadEvents();
    }

    onFilterChange() {
        this.loadEvents();
    }

    clearFilters() {
        this.filters = {
            category: '',
            dateFrom: '',
            dateTo: '',
            priceMax: '',
            sortBy: 'date'
        };
        this.loadEvents();
    }

    private loadEvents() {
        this.isLoading = true;
        const priceMax = this.filters.priceMax !== '' ? Number(this.filters.priceMax) : undefined;

        this.events$ = this.eventService.getEventsFiltered({
            category: this.filters.category || undefined,
            dateFrom: this.filters.dateFrom || undefined,
            dateTo: this.filters.dateTo || undefined,
            priceMax,
            sortBy: this.filters.sortBy as 'date' | 'price' | 'popularity'
        }).pipe(
            finalize(() => {
                this.isLoading = false;
            })
        );
    }
}

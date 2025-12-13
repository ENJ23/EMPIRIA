import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';
import { Observable } from 'rxjs';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';

@Component({
    selector: 'app-events-list',
    standalone: true,
    imports: [CommonModule, EventCardComponent],
    templateUrl: './events-list.component.html',
    styleUrl: './events-list.component.css'
})
export class EventsListComponent implements OnInit {
    events$!: Observable<Event[]>;

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.events$ = this.eventService.getEvents();
    }
}

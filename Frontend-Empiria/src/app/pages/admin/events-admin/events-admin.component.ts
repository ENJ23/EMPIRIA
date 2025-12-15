import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../core/services/event.service';
import { Observable } from 'rxjs';
import { Event } from '../../../core/models/event.model';

@Component({
    selector: 'app-events-admin',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './events-admin.component.html',
    styleUrl: './events-admin.component.css'
})
export class EventsAdminComponent implements OnInit {
    events$!: Observable<Event[]>;

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.events$ = this.eventService.getEvents();
    }
}

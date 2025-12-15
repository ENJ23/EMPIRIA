import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../../core/services/event.service';
import { Observable } from 'rxjs';
import { Event } from '../../../core/models/event.model';

@Component({
    selector: 'app-sales-admin',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './sales-admin.component.html',
    styleUrl: './sales-admin.component.css'
})
export class SalesAdminComponent implements OnInit {
    events$!: Observable<Event[]>;

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.events$ = this.eventService.getEvents();
    }
}

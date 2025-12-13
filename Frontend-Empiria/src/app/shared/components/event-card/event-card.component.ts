import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Event } from '../../../core/models/event.model';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-event-card',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './event-card.component.html',
    styleUrl: './event-card.component.css'
})
export class EventCardComponent {
    @Input() event!: Event;
}

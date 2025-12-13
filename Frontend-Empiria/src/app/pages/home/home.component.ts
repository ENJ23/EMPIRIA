import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeroSliderComponent } from '../../shared/components/hero-slider/hero-slider.component';
import { EventCardComponent } from '../../shared/components/event-card/event-card.component';
import { EventService } from '../../core/services/event.service';
import { Observable } from 'rxjs';
import { Event } from '../../core/models/event.model';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterLink, HeroSliderComponent, EventCardComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
    upcomingEvents$!: Observable<Event[]>;

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.upcomingEvents$ = this.eventService.getUpcomingEvents();
    }
}

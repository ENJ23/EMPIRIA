import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventService } from '../../core/services/event.service';
import { Event } from '../../core/models/event.model';

@Component({
    selector: 'app-calendar',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './calendar.component.html',
    styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit {
    weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    calendarDays: (Date | null)[] = [];
    currentMonth: Date = new Date();
    events: Event[] = [];

    private cdr = inject(ChangeDetectorRef);

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.generateCalendar();
        this.eventService.getEvents().subscribe({
            next: (events) => {
                this.events = events;
                // No need to regenerate grid, just the events on top of it
                this.cdr.detectChanges(); // Force UI update
            },
            error: (err) => console.error('Error loading events for calendar', err)
        });
    }

    generateCalendar() {
        this.calendarDays = [];
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Add empty days for padding
        for (let i = 0; i < firstDay.getDay(); i++) {
            this.calendarDays.push(null);
        }

        // Add days of the month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            this.calendarDays.push(new Date(year, month, i));
        }
    }

    prevMonth() {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
        this.generateCalendar();
    }

    nextMonth() {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
        this.generateCalendar();
    }

    getEventsForDay(date: Date | null): Event[] {
        if (!date) return [];
        return this.events.filter(e =>
            e.date.getDate() === date.getDate() &&
            e.date.getMonth() === date.getMonth() &&
            e.date.getFullYear() === date.getFullYear()
        );
    }

    isToday(date: Date | null): boolean {
        if (!date) return false;
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }
}

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService } from '../../../core/services/event.service';
import { Observable } from 'rxjs';
import { Event } from '../../../core/models/event.model';

@Component({
    selector: 'app-events-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './events-admin.component.html',
    styleUrl: './events-admin.component.css'
})
export class EventsAdminComponent implements OnInit {
    events$!: Observable<Event[]>;
    isFormOpen = false;
    isSaving = false;
    editingId: string | null = null;
    form: any = this.emptyForm();

    private cdr = inject(ChangeDetectorRef);

    constructor(private eventService: EventService) { }

    ngOnInit() {
        this.events$ = this.eventService.getEvents();
    }

    private emptyForm() {
        return {
            title: '',
            description: '',
            date: '',
            location: '',
            imageUrl: '',
            priceRange: { min: 0, max: 0 },
            capacity: 0,
            ticketsSold: 0,
            isPreventa: false,
            preventaPrice: undefined,
            preventaLimit: undefined,
            preventaTicketsSold: 0,
            isFree: false,              // NUEVO
            onlyGeneralPrice: false,    // NUEVO
            categories: [] as string[]
        };
    }

    openCreate() {
        this.isFormOpen = true;
        this.editingId = null;
        this.form = this.emptyForm();
    }

    openEdit(ev: Event) {
        this.isFormOpen = true;
        this.editingId = ev.id;
        this.form = {
            title: ev.title,
            description: ev.description,
            date: ev.date ? new Date(ev.date).toISOString().slice(0, 16) : '',
            location: ev.location,
            imageUrl: ev.imageUrl,
            priceRange: { min: ev.priceRange.min, max: ev.priceRange.max },
            capacity: ev.capacity,
            ticketsSold: ev.ticketsSold,
            isPreventa: ev.isPreventa,
            preventaPrice: ev.preventaPrice,
            preventaLimit: ev.preventaLimit,
            preventaTicketsSold: ev.preventaTicketsSold || 0,
            isFree: ev.isFree || false,              // NUEVO
            onlyGeneralPrice: ev.onlyGeneralPrice || false,  // NUEVO
            categories: ev.categories || []
        };
    }

    cancel() {
        this.isFormOpen = false;
        this.editingId = null;
        this.form = this.emptyForm();
    }

    save() {
        if (this.isSaving) return;
        this.isSaving = true;

        const payload = {
            ...this.form,
            date: this.form.date ? new Date(this.form.date) : undefined
        };

        const obs = this.editingId
            ? this.eventService.updateEvent(this.editingId, payload)
            : this.eventService.createEvent(payload);

        obs.subscribe({
            next: () => {
                this.events$ = this.eventService.getEvents();
                this.isSaving = false;
                this.cancel();
                this.cdr.detectChanges(); // Force UI update
            },
            error: () => {
                this.isSaving = false;
                this.cdr.detectChanges(); // Force UI update
            }
        });
    }

    delete(ev: Event) {
        if (!confirm(`¿Eliminar el evento "${ev.title}"?`)) return;
        this.eventService.deleteEvent(ev.id).subscribe({
            next: () => {
                this.events$ = this.eventService.getEvents();
            }
        });
    }

    // ✅ NUEVO: Manejar cambio en el checkbox de evento gratuito
    toggleFreeEvent() {
        if (this.form.isFree) {
            // Si se marca como gratuito, resetear precios
            this.form.priceRange.min = 0;
            this.form.priceRange.max = 0;
            this.form.isPreventa = false;
            this.form.preventaPrice = undefined;
            this.form.preventaLimit = undefined;
        }
        this.cdr.detectChanges();
    }
}


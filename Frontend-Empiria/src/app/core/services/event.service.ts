import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Event } from '../models/event.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class EventService {
    private apiUrl = `${environment.apiUrl}/events`;

    constructor(private http: HttpClient) { }

    getEvents(): Observable<Event[]> {
        return this.http.get<any>(this.apiUrl).pipe(
            map(res => {
                // Map backend response to frontend model
                // Dates come as strings from JSON, need to convert to Date objects
                return res.events.map((e: any) => ({
                    ...e,
                    id: e._id, // Map _id to id
                    date: new Date(e.date)
                }));
            })
        );
    }

    getEventById(id: string): Observable<Event | undefined> {
        return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
            map(res => {
                if (!res.event) return undefined;
                const e = res.event;
                return {
                    ...e,
                    id: e._id,
                    date: new Date(e.date)
                };
            })
        );
    }

    getUpcomingEvents(): Observable<Event[]> {
        return this.getEvents().pipe(
            map(events => events.sort((a, b) => a.date.getTime() - b.date.getTime()))
        );
    }
}

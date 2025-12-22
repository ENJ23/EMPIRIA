import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Event } from '../models/event.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class EventService {
    private apiUrl = `${environment.apiUrl}/events`;

    constructor(private http: HttpClient, private auth: AuthService) { }

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

    createEvent(payload: Partial<Event>): Observable<Event> {
        const token = this.auth.getToken();
        return this.http.post<any>(this.apiUrl, payload, {
            headers: { 'x-token': token || '' }
        }).pipe(
            map(res => {
                const e = res.event;
                return { ...e, id: e._id, date: new Date(e.date) } as Event;
            })
        );
    }

    updateEvent(id: string, payload: Partial<Event>): Observable<Event> {
        const token = this.auth.getToken();
        return this.http.put<any>(`${this.apiUrl}/${id}`, payload, {
            headers: { 'x-token': token || '' }
        }).pipe(
            map(res => {
                const e = res.event;
                return { ...e, id: e._id, date: new Date(e.date) } as Event;
            })
        );
    }

    deleteEvent(id: string): Observable<void> {
        const token = this.auth.getToken();
        return this.http.delete<any>(`${this.apiUrl}/${id}`, {
            headers: { 'x-token': token || '' }
        }).pipe(map(() => void 0));
    }
}

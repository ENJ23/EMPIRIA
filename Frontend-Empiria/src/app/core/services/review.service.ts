import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { Review, ReviewPagination, ReviewSummary } from '../models/review.model';

@Injectable({
    providedIn: 'root'
})
export class ReviewService {
    private apiUrl = `${environment.apiUrl}/events`;

    constructor(private http: HttpClient, private auth: AuthService) {}

    getEventReviews(eventId: string, page = 1, limit = 5): Observable<{ summary: ReviewSummary; reviews: Review[]; pagination: ReviewPagination }> {
        return this.http.get<any>(`${this.apiUrl}/${eventId}/reviews`, {
            params: {
                page: String(page),
                limit: String(limit)
            }
        }).pipe(
            map(res => ({
                summary: res.summary,
                reviews: res.reviews.map((r: any) => ({
                    id: r._id,
                    event: r.event,
                    user: r.user,
                    rating: r.rating,
                    comment: r.comment,
                    createdAt: r.createdAt
                })),
                pagination: res.pagination
            }))
        );
    }

    createReview(eventId: string, payload: { rating: number; comment: string }): Observable<any> {
        const token = this.auth.getToken();
        return this.http.post<any>(`${this.apiUrl}/${eventId}/reviews`, payload, {
            headers: { 'x-token': token || '' }
        });
    }

    updateReview(eventId: string, reviewId: string, payload: { rating: number; comment: string }): Observable<any> {
        const token = this.auth.getToken();
        return this.http.put<any>(`${this.apiUrl}/${eventId}/reviews/${reviewId}`, payload, {
            headers: { 'x-token': token || '' }
        });
    }

    deleteReview(eventId: string, reviewId: string): Observable<any> {
        const token = this.auth.getToken();
        return this.http.delete<any>(`${this.apiUrl}/${eventId}/reviews/${reviewId}`, {
            headers: { 'x-token': token || '' }
        });
    }
}

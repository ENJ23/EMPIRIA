import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EventsListComponent } from './pages/events-list/events-list.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { PromotionsComponent } from './pages/promotions/promotions.component';
import { ContactComponent } from './pages/contact/contact.component';


export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'events', component: EventsListComponent },
    { path: 'events/:id', component: EventDetailComponent },
    { path: 'calendar', component: CalendarComponent },
    { path: 'promociones', component: PromotionsComponent },
    { path: 'contacto', component: ContactComponent },
    { path: '**', redirectTo: '' }
];

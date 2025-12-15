import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { EventsListComponent } from './pages/events-list/events-list.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { PromotionsComponent } from './pages/promotions/promotions.component';
import { ContactComponent } from './pages/contact/contact.component';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/admin/login/login.component';
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { EventsAdminComponent } from './pages/admin/events-admin/events-admin.component';
import { SalesAdminComponent } from './pages/admin/sales-admin/sales-admin.component';


export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'events', component: EventsListComponent },
    { path: 'events/:id', component: EventDetailComponent },
    { path: 'calendar', component: CalendarComponent },
    { path: 'promociones', component: PromotionsComponent },
    { path: 'contacto', component: ContactComponent },

    // Admin Routes
    { path: 'admin/login', component: LoginComponent },
    {
        path: 'admin',
        component: DashboardComponent,
        canActivate: [authGuard],
        children: [
            { path: 'events', component: EventsAdminComponent },
            { path: 'sales', component: SalesAdminComponent },
            { path: '', redirectTo: 'events', pathMatch: 'full' }
        ]
    },

    { path: '**', redirectTo: '' }
];

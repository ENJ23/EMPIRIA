import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQRImport from 'jsqr';
import { TicketService } from '../../../core/services/ticket.service';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { Event } from '../../../core/models/event.model';

@Component({
    selector: 'app-check-in',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './check-in.component.html',
    styleUrl: './check-in.component.css'
})
export class CheckInComponent implements OnInit, OnDestroy {
    @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;
    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

    isCameraActive = false;
    isScanning = false;
    isProcessing = false;

    events: Event[] = [];
    selectedEventId = '';
    isLoadingEvents = false;

    manualInput = '';
    resultStatus: 'idle' | 'success' | 'error' = 'idle';
    resultMessage = '';
    resultTicket: any = null;

    private stream: MediaStream | null = null;
    private frameRequestId: number | null = null;
    private resumeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private qrReader = ((jsQRImport as any)?.default || jsQRImport) as any;

    private ticketService = inject(TicketService);
    private authService = inject(AuthService);
    private eventService = inject(EventService);

    ngOnInit() {
        this.loadEvents();
    }

    ngOnDestroy() {
        this.stopCamera();
    }

    get isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    private loadEvents() {
        this.isLoadingEvents = true;
        this.eventService.getEvents().subscribe({
            next: (events) => {
                this.events = (events || []).sort((a, b) => this.getEventTime(a) - this.getEventTime(b));
                if (!this.selectedEventId && this.events.length) {
                    const now = Date.now();
                    const upcoming = this.events.find(e => this.getEventTime(e) >= now);
                    this.selectedEventId = upcoming?.id || this.events[0].id;
                }
                this.isLoadingEvents = false;
            },
            error: () => {
                this.events = [];
                this.isLoadingEvents = false;
            }
        });
    }

    async startCamera() {
        if (!this.isAdmin) return;

        try {
            this.resultStatus = 'idle';
            this.resultMessage = '';
            this.resultTicket = null;

            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });

            if (this.videoRef?.nativeElement) {
                this.videoRef.nativeElement.srcObject = this.stream;
                await this.videoRef.nativeElement.play();
                this.isCameraActive = true;
                this.isScanning = true;
                this.scanLoop();
            }
        } catch (error) {
            this.resultStatus = 'error';
            this.resultMessage = 'No se pudo acceder a la cámara. Verifica permisos y que el sitio esté en HTTPS.';
        }
    }

    stopCamera() {
        if (this.resumeTimeoutId) {
            clearTimeout(this.resumeTimeoutId);
            this.resumeTimeoutId = null;
        }
        if (this.frameRequestId) {
            cancelAnimationFrame(this.frameRequestId);
            this.frameRequestId = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.isCameraActive = false;
        this.isScanning = false;
    }

    resumeScanning() {
        if (!this.isCameraActive) return;
        if (this.resumeTimeoutId) {
            clearTimeout(this.resumeTimeoutId);
            this.resumeTimeoutId = null;
        }
        this.resultStatus = 'idle';
        this.resultMessage = '';
        this.resultTicket = null;
        this.isScanning = true;
        this.scanLoop();
    }

    private scanLoop() {
        if (!this.isScanning) return;

        const video = this.videoRef?.nativeElement;
        const canvas = this.canvasRef?.nativeElement;

        if (!video || !canvas || video.readyState < 2) {
            this.frameRequestId = requestAnimationFrame(() => this.scanLoop());
            return;
        }

        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) {
            this.frameRequestId = requestAnimationFrame(() => this.scanLoop());
            return;
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            this.frameRequestId = requestAnimationFrame(() => this.scanLoop());
            return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        let code: { data: string } | null = null;
        try {
            code = this.qrReader(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
        } catch {
            code = null;
        }

        if (code?.data && !this.isProcessing) {
            this.isScanning = false;
            this.verifyQr(code.data);
            return;
        }

        this.frameRequestId = requestAnimationFrame(() => this.scanLoop());
    }

    verifyManual() {
        const value = this.manualInput.trim();
        if (!value || this.isProcessing) return;
        this.verifyQr(value);
    }

    private verifyQr(rawData: string) {
        const qrText = (rawData || '').trim();
        const parsedPayload = this.parseQrPayload(qrText);
        const qrEventId = parsedPayload?.eventId ? String(parsedPayload.eventId) : '';

        if (!this.selectedEventId && qrEventId) {
            this.selectedEventId = qrEventId;
        }

        if (!this.selectedEventId) {
            this.resultStatus = 'error';
            this.resultMessage = 'Selecciona un evento antes de validar.';
            this.scheduleAutoResume();
            return;
        }

        if (qrEventId && this.selectedEventId !== qrEventId) {
            this.resultStatus = 'error';
            this.resultMessage = 'El QR pertenece a otro evento. Cambia el evento seleccionado.';
            this.scheduleAutoResume();
            return;
        }

        this.isProcessing = true;
        this.resultStatus = 'idle';
        this.resultMessage = '';
        this.resultTicket = null;

        this.ticketService.verifyTicket({ qrData: qrText, eventId: this.selectedEventId }).subscribe({
            next: (res) => {
                this.resultStatus = 'success';
                this.resultMessage = res?.msg || 'Ingreso confirmado.';
                this.resultTicket = res?.ticket || null;
                this.isProcessing = false;
                this.scheduleAutoResume();
            },
            error: (err) => {
                this.resultStatus = 'error';
                this.resultMessage = err?.error?.msg || 'No se pudo verificar la entrada.';
                this.resultTicket = null;
                this.isProcessing = false;
                this.scheduleAutoResume();
            }
        });
    }

    private parseQrPayload(rawData: string): any {
        try {
            const parsed = JSON.parse(rawData);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }

    private scheduleAutoResume(delayMs = 1500) {
        if (!this.isCameraActive) return;
        if (this.resumeTimeoutId) {
            clearTimeout(this.resumeTimeoutId);
        }
        this.resumeTimeoutId = setTimeout(() => {
            if (this.isCameraActive && !this.isProcessing) {
                this.resumeScanning();
            }
        }, delayMs);
    }

    private getEventTime(event: Event): number {
        if (!event?.date) return Number.MAX_SAFE_INTEGER;
        const date = event.date instanceof Date ? event.date : new Date(event.date);
        const time = date.getTime();
        return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    }
}

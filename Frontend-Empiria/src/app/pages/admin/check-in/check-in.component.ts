import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQR from 'jsqr';
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

    isAdmin = false;
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

    private ticketService = inject(TicketService);
    private authService = inject(AuthService);
    private eventService = inject(EventService);

    ngOnInit() {
        this.isAdmin = this.authService.isAdmin();
        if (this.isAdmin) {
            this.loadEvents();
        }
    }

    ngOnDestroy() {
        this.stopCamera();
    }

    private loadEvents() {
        this.isLoadingEvents = true;
        this.eventService.getEvents().subscribe({
            next: (events) => {
                this.events = (events || []).sort((a, b) => a.date.getTime() - b.date.getTime());
                if (!this.selectedEventId && this.events.length) {
                    this.selectedEventId = this.events[0].id;
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
            this.resultMessage = 'No se pudo acceder a la camara.';
        }
    }

    stopCamera() {
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
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            this.frameRequestId = requestAnimationFrame(() => this.scanLoop());
            return;
        }

        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, width, height);

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
        if (!this.selectedEventId) {
            this.resultStatus = 'error';
            this.resultMessage = 'Selecciona un evento antes de validar.';
            return;
        }
        this.isProcessing = true;
        this.resultStatus = 'idle';
        this.resultMessage = '';
        this.resultTicket = null;

        this.ticketService.verifyTicket({ qrData: rawData, eventId: this.selectedEventId }).subscribe({
            next: (res) => {
                this.resultStatus = 'success';
                this.resultMessage = res?.msg || 'Ingreso confirmado.';
                this.resultTicket = res?.ticket || null;
                this.isProcessing = false;
            },
            error: (err) => {
                this.resultStatus = 'error';
                this.resultMessage = err?.error?.msg || 'No se pudo verificar la entrada.';
                this.resultTicket = null;
                this.isProcessing = false;
            }
        });
    }
}

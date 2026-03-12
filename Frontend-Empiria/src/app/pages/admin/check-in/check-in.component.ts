import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsQRImport from 'jsqr';
import { environment } from '../../../../environments/environment';
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
    cooldownSecondsLeft = 0;

    private stream: MediaStream | null = null;
    private frameRequestId: number | null = null;
    private resumeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    private qrReader = ((jsQRImport as any)?.default || jsQRImport) as any;
    private barcodeDetector: any = null;
    private isDecodingFrame = false;
    private frameCount = 0;
    private lastScanKey = '';
    private lastScanAt = 0;
    private readonly duplicateScanCooldownMs = this.resolveMs(
        environment?.checkIn?.duplicateScanCooldownMs,
        8000,
        2000,
        30000
    );
    private readonly duplicateResumeDelayMs = this.resolveMs(
        environment?.checkIn?.duplicateResumeDelayMs,
        3500,
        1000,
        15000
    );
    private readonly defaultResumeDelayMs = this.resolveMs(
        environment?.checkIn?.defaultResumeDelayMs,
        5000,
        1000,
        15000
    );
    private cooldownUntil = 0;
    private cooldownIntervalId: ReturnType<typeof setInterval> | null = null;

    private ticketService = inject(TicketService);
    private authService = inject(AuthService);
    private eventService = inject(EventService);
    private cdr = inject(ChangeDetectorRef);

    ngOnInit() {
        this.initBarcodeDetector();
        this.loadEvents();
    }

    ngOnDestroy() {
        this.stopCamera();
    }

    get isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    get duplicateScanCooldownSeconds(): number {
        return Math.round(this.duplicateScanCooldownMs / 1000);
    }

    get defaultResumeDelaySeconds(): number {
        return Math.round(this.defaultResumeDelayMs / 1000);
    }

    private loadEvents() {
        this.isLoadingEvents = true;
        this.cdr.detectChanges();
        this.eventService.getEvents().subscribe({
            next: (events) => {
                this.events = (events || []).sort((a, b) => this.getEventTime(a) - this.getEventTime(b));
                if (!this.selectedEventId && this.events.length) {
                    const now = Date.now();
                    const upcoming = this.events.find(e => this.getEventTime(e) >= now);
                    this.selectedEventId = upcoming?.id || this.events[0].id;
                }
                this.isLoadingEvents = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.events = [];
                this.isLoadingEvents = false;
                this.cdr.detectChanges();
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
                this.cdr.detectChanges();
                this.scanLoop();
            }
        } catch (error) {
            this.resultStatus = 'error';
            this.resultMessage = 'No se pudo acceder a la cámara. Verifica permisos y que el sitio esté en HTTPS.';
            this.cdr.detectChanges();
        }
    }

    stopCamera() {
        this.clearCooldownTimer();
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
        this.isDecodingFrame = false;
        this.cdr.detectChanges();
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
        this.cooldownSecondsLeft = 0;
        this.cdr.detectChanges();
        this.scanLoop();
    }

    private async scanLoop() {
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

        if (this.isDecodingFrame) {
            this.frameRequestId = requestAnimationFrame(() => this.scanLoop());
            return;
        }

        this.isDecodingFrame = true;

        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        let decodedValue: string | null = null;

        const jsQrValue = this.decodeWithJsQr(imageData, width, height);
        if (jsQrValue) {
            decodedValue = jsQrValue;
        } else {
            this.frameCount += 1;
            if (this.frameCount % 8 === 0) {
                decodedValue = await this.decodeWithBarcodeDetector(canvas);
            }
        }

        this.isDecodingFrame = false;

        if (decodedValue && !this.isProcessing) {
            this.isScanning = false;
            this.cdr.detectChanges();
            this.verifyQr(decodedValue);
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
        const scanKey = this.getScanKey(qrText, parsedPayload);
        const now = Date.now();

        if (scanKey && scanKey === this.lastScanKey && now - this.lastScanAt < this.duplicateScanCooldownMs) {
            this.startCooldownIndicator();
            this.scheduleAutoResume(this.duplicateResumeDelayMs);
            return;
        }

        this.clearCooldownTimer();

        this.lastScanKey = scanKey;
        this.lastScanAt = now;

        if (!this.selectedEventId && qrEventId) {
            this.selectedEventId = qrEventId;
        }

        if (!this.selectedEventId) {
            this.resultStatus = 'error';
            this.resultMessage = 'Selecciona un evento antes de validar.';
            this.cdr.detectChanges();
            this.scheduleAutoResume();
            return;
        }

        if (qrEventId && this.selectedEventId !== qrEventId) {
            this.resultStatus = 'error';
            this.resultMessage = 'El QR pertenece a otro evento. Cambia el evento seleccionado.';
            this.cdr.detectChanges();
            this.scheduleAutoResume();
            return;
        }

        this.isProcessing = true;
        this.resultStatus = 'idle';
        this.resultMessage = '';
        this.resultTicket = null;
        this.cdr.detectChanges();

        this.ticketService.verifyTicket({ qrData: qrText, eventId: this.selectedEventId }).subscribe({
            next: (res) => {
                this.resultStatus = 'success';
                this.resultMessage = res?.msg || 'Ingreso confirmado.';
                this.resultTicket = res?.ticket || null;
                this.isProcessing = false;
                this.cdr.detectChanges();
                this.scheduleAutoResume();
            },
            error: (err) => {
                this.resultStatus = 'error';
                this.resultMessage = err?.error?.msg || 'No se pudo verificar la entrada.';
                this.resultTicket = null;
                this.isProcessing = false;
                this.cdr.detectChanges();
                this.scheduleAutoResume();
            }
        });
    }

    private initBarcodeDetector() {
        const detectorCtor = (globalThis as any)?.BarcodeDetector;
        if (!detectorCtor) return;
        try {
            this.barcodeDetector = new detectorCtor({ formats: ['qr_code'] });
        } catch {
            this.barcodeDetector = null;
        }
    }

    private decodeWithJsQr(imageData: ImageData, width: number, height: number): string | null {
        try {
            const code = this.qrReader(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });
            return code?.data || null;
        } catch {
            return null;
        }
    }

    private async decodeWithBarcodeDetector(source: CanvasImageSource): Promise<string | null> {
        if (!this.barcodeDetector) return null;
        try {
            const codes = await this.barcodeDetector.detect(source);
            if (!codes || !codes.length) return null;
            return codes[0]?.rawValue || null;
        } catch {
            return null;
        }
    }

    private parseQrPayload(rawData: string): any {
        try {
            const parsed = JSON.parse(rawData);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    }

    private scheduleAutoResume(delayMs = this.defaultResumeDelayMs) {
        if (!this.isCameraActive) return;
        if (this.resumeTimeoutId) {
            clearTimeout(this.resumeTimeoutId);
        }
        this.resumeTimeoutId = setTimeout(() => {
            if (this.isCameraActive && !this.isProcessing) {
                this.resumeScanning();
            }
        }, delayMs);
        this.cdr.detectChanges();
    }

    private startCooldownIndicator() {
        this.cooldownUntil = this.lastScanAt + this.duplicateScanCooldownMs;
        this.updateCooldownSeconds();

        if (this.cooldownIntervalId) {
            clearInterval(this.cooldownIntervalId);
        }

        this.cooldownIntervalId = setInterval(() => {
            this.updateCooldownSeconds();
            if (this.cooldownSecondsLeft <= 0) {
                this.clearCooldownTimer();
            }
        }, 250);
        this.cdr.detectChanges();
    }

    private updateCooldownSeconds() {
        const remainingMs = Math.max(0, this.cooldownUntil - Date.now());
        this.cooldownSecondsLeft = Math.ceil(remainingMs / 1000);
        this.cdr.detectChanges();
    }

    private clearCooldownTimer() {
        if (this.cooldownIntervalId) {
            clearInterval(this.cooldownIntervalId);
            this.cooldownIntervalId = null;
        }
        this.cooldownSecondsLeft = 0;
    }

    private getScanKey(qrText: string, parsedPayload: any): string {
        if (parsedPayload?.ticketId) {
            return String(parsedPayload.ticketId);
        }

        const match = qrText.match(/[a-fA-F0-9]{24}/);
        if (match) {
            return match[0];
        }

        return qrText;
    }

    private getEventTime(event: Event): number {
        if (!event?.date) return Number.MAX_SAFE_INTEGER;
        const date = event.date instanceof Date ? event.date : new Date(event.date);
        const time = date.getTime();
        return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
    }

    private resolveMs(value: unknown, fallback: number, min: number, max: number): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.min(Math.max(parsed, min), max);
    }
}

declare module 'jsqr' {
    interface QRCode {
        data: string;
        binaryData: Uint8ClampedArray;
        location?: unknown;
    }

    export default function jsQR(
        data: Uint8ClampedArray,
        width: number,
        height: number
    ): QRCode | null;
}

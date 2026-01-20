# User Dashboard - Quick Start Guide

## 🎯 Objective
Enable authenticated users to view their tickets and payments, and recover lost QR codes before the 10-minute reservation expires.

## 📍 New Routes

### For Users
1. **My Tickets**: `/mis-entradas`
   - View all purchased tickets
   - Download or view QR codes
   - See ticket status and event details

2. **My Payments**: `/mis-pagos`
   - View all payment history
   - Track payment status (Approved, Pending, Rejected)
   - See reservation time remaining
   - Access payment link if still pending

### For Developers
1. **Get User Tickets**: `GET /api/tickets/my-tickets`
   - Returns all tickets for authenticated user
   - Requires JWT token

2. **Get User Payments**: `GET /api/payments/my-payments`
   - Returns all payments for authenticated user
   - Includes reservation countdown
   - Requires JWT token

## 🔐 Security
- Both routes require JWT authentication (via authGuard)
- Users can only access their own data
- Token automatically injected via HTTP interceptor

## 📱 User Flow for QR Recovery

### Scenario: User loses QR code after paying
1. **Option A - Payment already processed:**
   - Go to `/mis-entradas` (My Tickets)
   - Find the event
   - Click "Ver QR" or "Descargar QR"
   - ✅ Done!

2. **Option B - Payment not yet processed (0-10 min window):**
   - Go to `/mis-pagos` (My Payments)
   - Find the pending payment
   - See time remaining (e.g., "5 minutos restantes")
   - Click "Ir a Pagar" to complete payment
   - After payment, go to `/mis-entradas` to get QR
   - ✅ Done!

## 🛠️ Files Modified/Created

### Backend
```
Backend-Empiria/
├── src/
│   ├── models/
│   │   └── Payment.js (added mp_init_point field)
│   ├── controllers/
│   │   ├── paymentController.js (added getMyPayments)
│   │   └── ticketController.js (already has getMyTickets)
│   └── routes/
│       ├── payment.routes.js (added GET /my-payments)
│       └── ticket.routes.js (added GET /my-tickets)
```

### Frontend
```
Frontend-Empiria/src/app/
├── core/
│   └── services/
│       ├── payment.service.ts (added getMyPayments)
│       └── ticket.service.ts (added getMyTickets)
├── pages/
│   ├── my-tickets/ (NEW)
│   │   ├── my-tickets.component.ts
│   │   ├── my-tickets.component.html
│   │   └── my-tickets.component.css
│   └── my-payments/ (NEW)
│       ├── my-payments.component.ts
│       ├── my-payments.component.html
│       └── my-payments.component.css
└── app.routes.ts (added /mis-entradas and /mis-pagos routes)
```

## 📊 Data Returned

### Tickets Data
```typescript
{
  id: string;
  event: {
    title: string;
    date: string;
    location: string;
  };
  status: 'used' | 'active' | 'valid' | 'expired' | 'pending';
  amount: number;
  purchasedAt: string;
  entryQr: string; // URL to QR code image
  isUsed: boolean;
}
```

### Payments Data
```typescript
{
  id: string;
  event: {
    title: string;
    date: string;
    location: string;
  };
  quantity: number;
  ticketType: 'general' | 'vip' | 'other';
  mp_payment_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  
  // Reservation info
  isReserved: boolean;
  reservationConfirmed: boolean;
  reservedUntil: string | null;
  isReservationActive: boolean;
  timeRemainingMinutes: number; // ← Key for countdown!
  
  // Payment link
  canAccessQR: boolean;
  mp_init_point: string | null; // ← Link to pay or resume
}
```

## 🎨 UI Features

### My Tickets Page
- Grid layout with cards
- Event details (title, date, location)
- Price and purchase date
- Color-coded status badges
- QR code display with view/download buttons
- Empty state message
- Error handling with retry
- Mobile responsive

### My Payments Page
- Grid layout with cards
- Event details (title, date, location)
- Payment status with color coding
- **Reservation alert box** showing:
  - "X minutos restantes" (e.g., "5 minutos restantes")
  - Warning if expiring soon
  - Expired state if time's up
- "Ir a Pagar" button for pending payments
- Success/failure messages
- Auto-refresh every 30 seconds
- Empty state message
- Error handling with retry
- Mobile responsive

## ⏱️ Reservation Behavior

### Timeline
```
User clicks "Comprar" (initiates payment)
    ↓
Reservation created (10-minute countdown starts)
    ↓
[0-10 min] User can:
    • Complete payment → tickets generated
    • Access payment link from /mis-pagos
    • See QR code from /mis-entradas (if paid)
    ↓
[10+ min] Reservation expires
    • Reservation deleted by TTL index
    • Stock released back to event
    • User must start new purchase
```

## 🧪 Quick Testing

### Test Case 1: Happy Path
1. Login as user
2. Buy 1 ticket
3. Go to `/mis-entradas` → see ticket with QR
4. Go to `/mis-pagos` → see approved payment

### Test Case 2: QR Recovery
1. Login as user
2. Initiate payment but don't complete
3. Go to `/mis-pagos` → see pending payment with countdown
4. Click "Ir a Pagar" → go to Mercado Pago
5. Complete payment
6. Go to `/mis-entradas` → see new ticket with QR

### Test Case 3: Multiple Tickets
1. Login as user
2. Buy 3 tickets in one transaction
3. Go to `/mis-entradas` → see 3 tickets
4. Go to `/mis-pagos` → see 1 payment with quantity=3

### Test Case 4: Expired Reservation
1. Login as user
2. Initiate payment
3. Go to `/mis-pagos` → see countdown
4. Wait 10+ minutes (or simulate time passing)
5. Countdown changes to "Reserva expirada"
6. "Ir a Pagar" button may be disabled

## 🐛 Troubleshooting

### Issue: Can't see /mis-entradas or /mis-pagos
- **Check**: Are you logged in? (authGuard should redirect to login)
- **Check**: Is the route in app.routes.ts? (verified ✓)

### Issue: QR code not displaying
- **Check**: Is entryQr field populated in ticket? (Check ticketController)
- **Check**: Is the image URL valid? (Check generateQR function)

### Issue: "Ir a Pagar" link doesn't work
- **Check**: Is mp_init_point saved in Payment? (verified ✓)
- **Check**: Is the Mercado Pago URL valid?

### Issue: Countdown not updating
- **Check**: Is component auto-refresh working? (30-second interval set ✓)
- **Check**: Is the calculation correct? (timeRemainingMs / 60000)

## 📝 API Endpoints Documentation

### GET /api/tickets/my-tickets
```bash
curl -H "x-token: YOUR_JWT_TOKEN" \
  http://localhost:3001/api/tickets/my-tickets
```

Response:
```json
{
  "status": 1,
  "msg": "Entradas obtenidas correctamente",
  "data": [ /* tickets array */ ],
  "count": 5
}
```

### GET /api/payments/my-payments
```bash
curl -H "x-token: YOUR_JWT_TOKEN" \
  http://localhost:3001/api/payments/my-payments
```

Response:
```json
{
  "status": 1,
  "msg": "Pagos obtenidos correctamente",
  "data": [ /* payments array */ ],
  "count": 3
}
```

## 🚀 Next Steps

1. **Test in Development**: Follow quick testing cases above
2. **Deploy to Production**: Ensure environment variables are set
3. **Monitor**: Check logs for any errors during first user interactions
4. **Gather Feedback**: Get user feedback on UX
5. **Enhancements**: Consider future improvements (pagination, filtering, etc.)

## 📞 Support

If issues arise:
1. Check `USER_DASHBOARD_VERIFICATION.md` for checklist
2. Review `USER_DASHBOARD_IMPLEMENTATION.md` for detailed documentation
3. Check browser console and server logs for errors
4. Verify JWT token is properly stored and transmitted

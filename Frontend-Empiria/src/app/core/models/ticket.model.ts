export interface TicketSummary {
    id: string;
    user: { id: string; name: string; email: string };
    event: { id: string; title: string; date: Date; location: string };
    status: 'approved' | 'pending' | 'rejected';
    amount: number;
    purchasedAt: Date;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: Date;
    location: string;
    imageUrl: string;
    priceRange: {
        min: number;
        max: number;
    };
    capacity: number;
    ticketsSold: number;
    isPreventa: boolean;
    preventaPrice?: number;
    preventaLimit?: number;
    categories: string[];
}

export interface TicketType {
    id: string;
    name: string;
    price: number;
    description?: string;
}

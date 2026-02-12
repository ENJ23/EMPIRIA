export interface Review {
    id?: string;
    event: string;
    user: {
        _id?: string;
        nombre: string;
        apellido?: string;
    };
    rating: number;
    comment: string;
    createdAt: string | Date;
}

export interface ReviewSummary {
    average: number;
    count: number;
}

export interface ReviewPagination {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}

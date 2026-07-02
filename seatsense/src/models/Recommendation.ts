import type { Seat } from "./Seat";

export interface Recommendation {
    seats: Seat[];
    score: number;
    distance: number;
    explanation: string[];
}

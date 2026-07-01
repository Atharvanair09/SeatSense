import type { Seat } from "../models/Seat";

export interface TheatreParser {
    parseSeats(): Seat[]
}
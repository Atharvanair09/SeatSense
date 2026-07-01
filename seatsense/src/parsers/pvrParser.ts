import type { Seat } from "../models/Seat";
import type { TheatreParser } from "./theatreParser";

export class PVRParser implements TheatreParser{
    parseSeats(): Seat[] {
        const rows = document.querySelectorAll(".seats-row");
        const seats: Seat[] = [];

        rows.forEach((rowElement, rowIndex) => {
            const cols = rowElement.querySelectorAll(".seats-col");
            
            cols.forEach((colElement, colIndex) => {
                const seatElement = colElement.querySelector("span[id]") as HTMLElement;
                
                if (seatElement && seatElement.id) {
                    // Extracting info from id formatted like "PP.PRIME PLUS|L:7"
                    const idParts = seatElement.id.split("|");
                    const category = idParts[0] || "";
                    
                    let row = "";
                    let seatNumber = 0;
                    
                    if (idParts.length > 1) {
                        const rowAndSeat = idParts[1].split(":");
                        row = rowAndSeat[0] || "";
                        seatNumber = parseInt(rowAndSeat[1], 10) || 0;
                    }

                    // Determining availability. Adjust this if PVR uses specific classes for booked seats
                    const available = !seatElement.className.toLowerCase().includes("sold") && 
                                      !seatElement.className.toLowerCase().includes("booked");

                    seats.push({
                        row: row,
                        seatNumber: seatNumber,
                        category: category,
                        available: available,
                        rowIndex: rowIndex,
                        colNumber: colIndex,
                        element: seatElement
                    });
                }
            });
        });

        return seats;
    }
}
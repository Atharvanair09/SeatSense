import type { Seat } from '../../models/Seat';
import { AuditoriumProfile } from '../AuditoriumProfile';

export const STANDARD_PROFILE: AuditoriumProfile = {
    name: "Standard",
    idealDepthRatio: 0.66,
    horizontalPreference: "center"
};

export function recommendSeats(seats: Seat[], profile: AuditoriumProfile = STANDARD_PROFILE): Seat[] {
    if (seats.length === 0) return [];

    const rowIndices = seats.map(s => Number(s.rowIndex));
    const minRow = Math.min(...rowIndices);
    const maxRow = Math.max(...rowIndices);
    const totalDepth = maxRow - minRow;
    
    // Ideal row index based on the profile's depth ratio (distance from screen)
    const idealRowIndex = minRow + (totalDepth * profile.idealDepthRatio);

    // Calculate score for each seat
    seats.forEach(seat => {
        // Find center for this specific row
        const seatsInRow = seats.filter(s => s.rowIndex === seat.rowIndex);
        const colIndices = seatsInRow.map(s => Number(s.colNumber));
        const minCol = Math.min(...colIndices);
        const maxCol = Math.max(...colIndices);
        
        // Target column based on horizontal preference
        let targetCol = (minCol + maxCol) / 2; // Default to center
        
        const rowDistance = Math.abs(Number(seat.rowIndex) - idealRowIndex);
        const colDistance = Math.abs(Number(seat.colNumber) - targetCol);
        
        // Normalize distances to calculate a fair penalty (0 to 1)
        const maxRowDistance = Math.max(Math.abs(maxRow - idealRowIndex), Math.abs(minRow - idealRowIndex)) || 1;
        const maxColDistance = (maxCol - minCol) / 2 || 1;

        const rowPenalty = rowDistance / maxRowDistance;
        const colPenalty = colDistance / maxColDistance;

        // Score out of 100 where higher is better (closer to ideal position)
        // Equal weighting for row and column proximity
        seat.score = 100 - ((rowPenalty * 50) + (colPenalty * 50));
    });

    // Return seats sorted by score descending
    return seats.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

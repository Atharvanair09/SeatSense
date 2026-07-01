import type { Seat } from '../models/Seat';
import { AuditoriumProfile } from './AuditoriumProfile';

export const PROFILES: Record<string, AuditoriumProfile> = {
    "Best Audio": { name: "Best Audio", idealDepthRatio: 0.66, horizontalPreference: "center" },
    "Max Immersion": { name: "Max Immersion", idealDepthRatio: 0.55, horizontalPreference: "center" },
    "Max Comfort": { name: "Max Comfort", idealDepthRatio: 0.67, horizontalPreference: "center" },
    "Headache Relief": { name: "Headache Relief", idealDepthRatio: 0.85, horizontalPreference: "center" }
};

export const STANDARD_PROFILE: AuditoriumProfile = PROFILES["Best Audio"];

export function recommendSeats(seats: Seat[], profile: AuditoriumProfile = STANDARD_PROFILE, ticketCount: number = 1): Seat[][] {
    if (seats.length === 0) return [];

    const rowIndices = seats.map(s => Number(s.rowIndex));
    const minRow = Math.min(...rowIndices);
    const maxRow = Math.max(...rowIndices);
    const totalDepth = maxRow - minRow;
    
    // Ideal row index based on the profile's depth ratio (distance from screen)
    const idealRowIndex = minRow + (totalDepth * profile.idealDepthRatio);

    // Group seats by row
    const rowMap = new Map<number, Seat[]>();
    seats.forEach(seat => {
        const rIndex = Number(seat.rowIndex);
        if (!rowMap.has(rIndex)) {
            rowMap.set(rIndex, []);
        }
        rowMap.get(rIndex)!.push(seat);
    });

    const scoredBlocks: { block: Seat[], score: number }[] = [];

    // Calculate score for each seat block
    rowMap.forEach((seatsInRow, rIndex) => {
        // Sort seats in row by column number to find contiguous blocks
        seatsInRow.sort((a, b) => Number(a.colNumber) - Number(b.colNumber));
        
        const colIndices = seatsInRow.map(s => Number(s.colNumber));
        const minCol = Math.min(...colIndices);
        const maxCol = Math.max(...colIndices);
        
        let targetCol = (minCol + maxCol) / 2; // Default to center
        
        const rowDistance = Math.abs(rIndex - idealRowIndex);
        const maxRowDistance = Math.max(Math.abs(maxRow - idealRowIndex), Math.abs(minRow - idealRowIndex)) || 1;
        const rowPenalty = rowDistance / maxRowDistance;

        // Find contiguous blocks of length ticketCount
        for (let i = 0; i <= seatsInRow.length - ticketCount; i++) {
            const block = seatsInRow.slice(i, i + ticketCount);
            // Check if seats in block are truly contiguous
            const isContiguous = Number(block[block.length - 1].colNumber) - Number(block[0].colNumber) === ticketCount - 1;
            
            if (isContiguous) {
                let totalColPenalty = 0;
                block.forEach(seat => {
                    const colDistance = Math.abs(Number(seat.colNumber) - targetCol);
                    const maxColDistance = (maxCol - minCol) / 2 || 1;
                    totalColPenalty += colDistance / maxColDistance;
                });
                const avgColPenalty = totalColPenalty / ticketCount;
                
                // Score out of 100 where higher is better (closer to ideal position)
                // High weighting for column proximity to prioritize center seats over ideal rows
                const score = 100 - ((rowPenalty * 15) + (avgColPenalty * 85));
                
                block.forEach(seat => seat.score = score);
                scoredBlocks.push({ block, score });
            }
        }
    });

    // Return blocks sorted by score descending
    scoredBlocks.sort((a, b) => b.score - a.score);
    return scoredBlocks.map(sb => sb.block);
}

import type { Seat } from '../models/Seat';
import type { RecommendationProfile } from '../config/profileBuilder';
import type { AuditoriumLayout } from '../layout/AuditoriumLayout';
import type { Recommendation } from '../models/Recommendation';

export function recommendSeats(seats: Seat[], layout: AuditoriumLayout, profile: RecommendationProfile, ticketCount: number = 1): Recommendation[] {
    if (seats.length === 0) return [];

    // Ideal row index based on the profile's depth ratio (distance from screen)
    const idealRowIndex = layout.minRow + (layout.totalRows * profile.depthRatio);

    // Group seats by row
    const rowMap = new Map<number, Seat[]>();
    seats.forEach(seat => {
        const rIndex = Number(seat.rowIndex);
        if (!rowMap.has(rIndex)) {
            rowMap.set(rIndex, []);
        }
        rowMap.get(rIndex)!.push(seat);
    });

    const recommendations: Recommendation[] = [];

    // Calculate score for each seat block
    rowMap.forEach((seatsInRow, rIndex) => {
        // Sort seats in row by column number to find contiguous blocks
        seatsInRow.sort((a, b) => Number(a.colNumber) - Number(b.colNumber));
        
        const rowGeom = layout.rowGeometry.get(rIndex);
        if (!rowGeom) return; // Should not happen, but safeguard
        
        const minCol = rowGeom.minColumn;
        const maxCol = rowGeom.maxColumn;
        
        // Use horizontalRatio to determine the target column position
        const targetCol = minCol + (maxCol - minCol) * profile.horizontalRatio;
        
        const rowDistance = Math.abs(rIndex - idealRowIndex);
        const maxRowDistance = Math.max(Math.abs(layout.maxRow - idealRowIndex), Math.abs(layout.minRow - idealRowIndex)) || 1;
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
                // Weights from the configuration profile
                const score = 100 - ((rowPenalty * profile.rowWeight * 100) + (avgColPenalty * profile.columnWeight * 100));
                
                block.forEach(seat => seat.score = score);
                recommendations.push({
                    seats: block,
                    score,
                    distance: rowDistance,
                    explanation: []
                });
            }
        }
    });

    // Return blocks sorted by score descending
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations;
}

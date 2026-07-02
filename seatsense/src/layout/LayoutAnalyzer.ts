import type { Seat } from '../models/Seat';
import type { ScreenType } from '../types/recommendation';
import type { AuditoriumLayout, RowGeometry } from './AuditoriumLayout';

export class LayoutAnalyzer {
    public analyze(seats: Seat[], screenType: ScreenType): AuditoriumLayout {
        if (seats.length === 0) {
            return {
                screenType,
                totalRows: 0,
                minRow: 0,
                maxRow: 0,
                maxColumns: 0,
                centerColumn: 0,
                rowGeometry: new Map()
            };
        }

        const rowIndices = seats.map(s => Number(s.rowIndex));
        const minRow = Math.min(...rowIndices);
        const maxRow = Math.max(...rowIndices);
        const totalRows = maxRow - minRow;

        const colIndices = seats.map(s => Number(s.colNumber));
        const minCol = Math.min(...colIndices);
        const maxCol = Math.max(...colIndices);
        const maxColumns = maxCol - minCol;
        const centerColumn = minCol + (maxColumns / 2);

        const rowGeometry = new Map<number, RowGeometry>();

        // Group seats by row to compute per-row geometry
        const rowMap = new Map<number, Seat[]>();
        seats.forEach(seat => {
            const rIndex = Number(seat.rowIndex);
            if (!rowMap.has(rIndex)) {
                rowMap.set(rIndex, []);
            }
            rowMap.get(rIndex)!.push(seat);
        });

        rowMap.forEach((seatsInRow, rIndex) => {
            const rowColIndices = seatsInRow.map(s => Number(s.colNumber));
            const rowMinCol = Math.min(...rowColIndices);
            const rowMaxCol = Math.max(...rowColIndices);
            
            rowGeometry.set(rIndex, {
                minColumn: rowMinCol,
                maxColumn: rowMaxCol,
                centerColumn: rowMinCol + (rowMaxCol - rowMinCol) / 2
            });
        });

        return {
            screenType,
            totalRows,
            minRow,
            maxRow,
            maxColumns,
            centerColumn,
            rowGeometry
        };
    }
}

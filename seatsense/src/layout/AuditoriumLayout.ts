import type { ScreenType } from "../types/recommendation";

export interface RowGeometry {
    minColumn: number;
    maxColumn: number;
    centerColumn: number;
}

export interface AuditoriumLayout {
    screenType: ScreenType;
    totalRows: number;
    minRow: number;
    maxRow: number;
    maxColumns: number;
    centerColumn: number;
    rowGeometry: Map<number, RowGeometry>;
}

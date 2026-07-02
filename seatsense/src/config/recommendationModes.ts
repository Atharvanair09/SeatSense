import type { RecommendationMode } from "../types/recommendation";

export interface RecommendationWeights {
    rowOffset: number;
    rowWeight: number;
    columnWeight: number;
}

export const MODE_PROFILES: Readonly<Record<RecommendationMode, Readonly<RecommendationWeights>>> = {
    IMMERSION: {
        rowOffset: 0.00,
        rowWeight: 0.60,
        columnWeight: 0.40
    },
    AUDIO: {
        rowOffset: -0.05,
        rowWeight: 0.50,
        columnWeight: 0.50
    },
    COMFORT: {
        rowOffset: 0.09,
        rowWeight: 0.70,
        columnWeight: 0.30
    },
    HEADACHE: {
        rowOffset: 0.14,
        rowWeight: 0.80,
        columnWeight: 0.20
    }
} as const;

import type { ScreenType, RecommendationMode } from "../types/recommendation";
import { SCREEN_CHARACTERISTICS } from "./screenCharacteristics";
import { MODE_PROFILES } from "./recommendationModes";

export interface RecommendationProfile {
    depthRatio: number;
    horizontalRatio: number;
    rowWeight: number;
    columnWeight: number;
}

export function buildRecommendationProfile(
    screenType: ScreenType,
    recommendationMode: RecommendationMode
): RecommendationProfile {
    const screen = SCREEN_CHARACTERISTICS[screenType];
    const mode = MODE_PROFILES[recommendationMode];

    let depthRatio = screen.defaultViewingDistance + mode.rowOffset;
    
    // Clamp depthRatio between 0.45 and 0.90
    depthRatio = Math.max(0.45, Math.min(0.90, depthRatio));

    return {
        depthRatio,
        horizontalRatio: screen.preferredHorizontalPosition,
        rowWeight: mode.rowWeight,
        columnWeight: mode.columnWeight
    };
}

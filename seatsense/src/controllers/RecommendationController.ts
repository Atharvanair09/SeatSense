import type { Seat } from "../models/Seat";
import type { ScreenType, RecommendationMode } from "../types/recommendation";
import type { Recommendation } from "../models/Recommendation";
import { LayoutAnalyzer } from "../layout/LayoutAnalyzer";
import { buildRecommendationProfile } from "../config/profileBuilder";
import { recommendSeats } from "../recommenders/DefaultRecommender";

export class RecommendationController {
    private layoutAnalyzer: LayoutAnalyzer;

    constructor() {
        this.layoutAnalyzer = new LayoutAnalyzer();
    }

    public getRecommendations(seats: Seat[], screenType: ScreenType, mode: RecommendationMode, ticketCount: number): Recommendation[] {
        const layout = this.layoutAnalyzer.analyze(seats, screenType);
        const profile = buildRecommendationProfile(screenType, mode);
        return recommendSeats(seats, layout, profile, ticketCount);
    }
}

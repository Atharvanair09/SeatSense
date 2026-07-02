import type { ScreenType } from "../types/recommendation";

export interface ScreenCharacteristics {
    name: string;
    description: string;
    preferredHorizontalPosition: number;
    defaultViewingDistance: number;
}

export const SCREEN_CHARACTERISTICS: Readonly<Record<ScreenType, Readonly<ScreenCharacteristics>>> = {
    IMAX: {
        name: "IMAX",
        description: "Large premium screen with a very wide field of view.",
        preferredHorizontalPosition: 0.50,
        defaultViewingDistance: 0.66
    },
    SCREENX: {
        name: "SCREENX",
        description: "Triple-screen panoramic experience.",
        preferredHorizontalPosition: 0.50,
        defaultViewingDistance: 0.72
    },
    "4DX": {
        name: "4DX",
        description: "Motion-enabled immersive auditorium.",
        preferredHorizontalPosition: 0.50,
        defaultViewingDistance: 0.60
    },
    MX4DX: {
        name: "MX4DX",
        description: "Premium motion-enabled auditorium with enhanced environmental effects.",
        preferredHorizontalPosition: 0.50,
        defaultViewingDistance: 0.65
    },
    "2D": {
        name: "2D",
        description: "Standard cinema auditorium.",
        preferredHorizontalPosition: 0.50,
        defaultViewingDistance: 0.60
    },
    "3D": {
        name: "3D",
        description: "Stereo projection auditorium.",
        preferredHorizontalPosition: 0.50,
        defaultViewingDistance: 0.65
    }
} as const;

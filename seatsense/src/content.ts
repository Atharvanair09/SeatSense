import type { PlasmoCSConfig } from "plasmo";
import { PVRParser } from "./parsers/pvrParser";
import { recommendSeats, STANDARD_PROFILE } from "./recommenders/IMAX/IMAXRecommender";

export const config: PlasmoCSConfig = {
  matches: ["https://www.pvrcinemas.com/seatlayout/*"]
};

// Store the top recommendations here so we can reply to the popup
let topRecommendations: any[] = [];
let highlighted = false;

function highlightSeats() {
    if (highlighted) return;
    
    const parser = new PVRParser();
    const seats = parser.parseSeats();
    
    if (seats.length === 0) return; // Wait until seats actually exist
    
    // Only recommend from available seats
    const availableSeats = seats.filter(seat => seat.available);
    
    // Get top 3 recommendations
    const recommended = recommendSeats(availableSeats, STANDARD_PROFILE).slice(0, 3);
    
    // Save for popup
    topRecommendations = recommended.map(seat => ({
        row: seat.row,
        seatNumber: seat.seatNumber,
        category: seat.category,
        score: seat.score
    }));
    
    recommended.forEach((seat, index) => {
        if (seat.element) {
            // Apply visual highlight depending on rank
            const color = index === 0 ? "gold" : index === 1 ? "silver" : "#cd7f32"; // Gold, Silver, Bronze
            seat.element.style.border = `2px solid ${color}`;
            seat.element.style.boxShadow = `0 0 10px ${color}`;
            seat.element.style.zIndex = "10";
            seat.element.style.position = "relative";
            seat.element.title = `Recommended (Rank ${index + 1}) - Score: ${Number(seat.score).toFixed(1)}`;
        }
    });
    
    highlighted = true;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_RECOMMENDATIONS") {
        sendResponse({ recommendations: topRecommendations });
    }
});

// Observe DOM for changes to catch dynamically loaded seats
const observer = new MutationObserver(() => {
    if (!highlighted && document.querySelector(".seats-row")) {
        highlightSeats();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Check for SPA navigation to reset the highlighter if the user changes showtimes
let lastUrl = location.href; 
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    highlighted = false;
    topRecommendations = []; // clear old recommendations
  }
}).observe(document, { subtree: true, childList: true });

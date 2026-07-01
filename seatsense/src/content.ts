import type { PlasmoCSConfig } from "plasmo";
import { PVRParser } from "./parsers/pvrParser";
import { recommendSeats, PROFILES, STANDARD_PROFILE } from "./recommenders/BaseRecommender";

export const config: PlasmoCSConfig = {
  matches: ["https://www.pvrcinemas.com/seatlayout/*"]
};

// Store the top recommendations here so we can reply to the popup
let topRecommendations: any[] = [];
let highlighted = false;
let currentProfile = PROFILES["Best Audio"];
let currentTicketCount = 1;
let currentlyHighlighted: HTMLElement[] = [];

function clearHighlights() {
    currentlyHighlighted.forEach(el => {
        el.style.border = "";
        el.style.boxShadow = "";
        el.style.backgroundColor = "";
        el.style.color = "";
        el.style.zIndex = "";
        el.style.position = "";
        el.title = "";
    });
    currentlyHighlighted = [];
    highlighted = false;
}

function getScreenType(): string {
    const screenTypeElement = document.querySelector('.seatlayout-date-wayed.three-view');
    if (screenTypeElement && screenTypeElement.textContent) {
        const words = screenTypeElement.textContent.replace(/,/g, ' ').trim().split(/\s+/).filter(w => w.length > 0);
        return [...new Set(words)].join(' ');
    }
    return '';
}

function addToggleUI(screenType: string, isSupported: boolean) {
    if (document.getElementById("seatsense-toggle-container")) return;

    console.log("SeatSense: Injecting toggle UI into page");
    const container = document.createElement("div");
    container.id = "seatsense-toggle-container";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.right = "20px";
    container.style.zIndex = "2147483647"; // Max z-index
    container.style.background = "white";
    container.style.color = "black";
    container.style.padding = "10px";
    container.style.borderRadius = "8px";
    container.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    container.style.display = "flex";
    container.style.gap = "5px";
    container.style.flexWrap = "wrap";
    container.style.maxWidth = "300px";

    const title = document.createElement("div");
    if (isSupported) {
        title.innerText = screenType ? `SeatSense Preference (${screenType}):` : "SeatSense Preference:";
    } else {
        title.innerText = `SeatSense: Coming soon for ${screenType || 'this screen type'}!`;
    }
    title.style.width = "100%";
    title.style.marginBottom = "5px";
    title.style.fontWeight = "bold";
    title.style.fontFamily = "sans-serif";
    title.style.fontSize = "14px";
    container.appendChild(title);

    if (isSupported) {
        Object.keys(PROFILES).forEach(p => {
            const btn = document.createElement("button");
            btn.innerText = p;
            btn.style.padding = "5px 10px";
            btn.style.border = "1px solid #ccc";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";
            btn.style.fontFamily = "sans-serif";
            btn.style.fontSize = "12px";
            btn.style.color = "black";
            btn.style.background = currentProfile.name === p ? "#e0e0e0" : "white";
            
            btn.onclick = () => {
                currentProfile = PROFILES[p];
                document.querySelectorAll("#seatsense-toggle-container button").forEach(b => {
                    (b as HTMLElement).style.background = b.innerHTML === p ? "#e0e0e0" : "white";
                });
                clearHighlights();
                highlightSeats();
            };
            container.appendChild(btn);
        });

        const ticketContainer = document.createElement("div");
        ticketContainer.style.width = "100%";
        ticketContainer.style.marginTop = "10px";
        
        const ticketLabel = document.createElement("label");
        ticketLabel.innerText = "Tickets: ";
        ticketLabel.style.fontFamily = "sans-serif";
        ticketLabel.style.fontSize = "12px";
        ticketLabel.style.fontWeight = "bold";
        
        const ticketInput = document.createElement("input");
        ticketInput.type = "number";
        ticketInput.min = "1";
        ticketInput.max = "10";
        ticketInput.value = currentTicketCount.toString();
        ticketInput.style.width = "40px";
        ticketInput.style.marginLeft = "5px";
        
        ticketInput.onchange = (e) => {
            currentTicketCount = parseInt((e.target as HTMLInputElement).value) || 1;
            clearHighlights();
            highlightSeats();
        };
        
        ticketContainer.appendChild(ticketLabel);
        ticketContainer.appendChild(ticketInput);
        container.appendChild(ticketContainer);
    }

    document.body.appendChild(container);
}

function highlightSeats() {
    if (highlighted) return;
    
    const screenType = getScreenType();
    const isSupported = screenType.toUpperCase().includes("IMAX");
    
    if (!isSupported) {
        addToggleUI(screenType, false);
        return;
    }
    
    const parser = new PVRParser();
    const seats = parser.parseSeats();
    
    if (seats.length === 0) return; // Wait until seats actually exist
    
    // Only recommend from available seats
    const availableSeats = seats.filter(seat => seat.available);
    
    // Get top 3 recommendations
    const recommendedBlocks = recommendSeats(availableSeats, currentProfile, currentTicketCount).slice(0, 3);
    
    // Save for popup
    topRecommendations = recommendedBlocks.map(block => block.map(seat => ({
        row: seat.row,
        seatNumber: seat.seatNumber,
        category: seat.category,
        score: seat.score
    })));
    
    recommendedBlocks.forEach((block, index) => {
        const color = index === 0 ? "red" : index === 1 ? "orange" : "green"; // Red, Orange, Green
        block.forEach(seat => {
            if (seat.element) {
                // Apply visual highlight depending on rank
                seat.element.style.backgroundColor = color;
                seat.element.style.color = "white"; // Ensure text remains visible
                seat.element.style.border = `2px solid ${color}`;
                seat.element.style.boxShadow = "none";
                seat.element.style.zIndex = "10";
                seat.element.style.position = "relative";
                seat.element.title = `Recommended (Rank ${index + 1}) - Score: ${Number(seat.score).toFixed(1)}`;
                currentlyHighlighted.push(seat.element);
            }
        });
    });
    
    highlighted = true;
    addToggleUI(screenType, true);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_RECOMMENDATIONS") {
        sendResponse({ recommendations: topRecommendations });
    }
});

// Observe DOM for changes to catch dynamically loaded seats
const observer = new MutationObserver(() => {
    const hasSeats = document.querySelector(".seats-row");
    
    if (hasSeats) {
        if (!highlighted) {
            highlightSeats();
        }
    } else {
        // Remove UI if seat arrangement is not on screen (e.g. user is on timings page)
        const container = document.getElementById("seatsense-toggle-container");
        if (container) {
            container.remove();
            clearHighlights();
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Check for SPA navigation to reset the highlighter if the user changes showtimes
let lastUrl = location.href; 
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    clearHighlights();
    const container = document.getElementById("seatsense-toggle-container");
    if (container) container.remove();
    topRecommendations = []; // clear old recommendations
  }
}).observe(document, { subtree: true, childList: true });

import type { PlasmoCSConfig } from "plasmo";
import { PVRParser } from "./parsers/pvrParser";
import { recommendSeats, PROFILES, STANDARD_PROFILE } from "./recommenders/BaseRecommender";
import iconBase64 from "data-base64:../assets/icon.png";
import imaxBase64 from "data-base64:../assets/imax.png";
import logo4dxBase64 from "data-base64:../assets/4dx.png";
import mx4dBase64 from "data-base64:../assets/mx4d.png";
import screenxBase64 from "data-base64:../assets/screenx.png";

export const config: PlasmoCSConfig = {
    matches: ["https://www.pvrcinemas.com/seatlayout/*"]
};

// Store the top recommendations here so we can reply to the popup
let topRecommendations: any[] = [];
let highlighted = false;
let currentProfile = PROFILES["Best Audio"];
let currentTicketCount = 1;
let currentlyHighlighted: HTMLElement[] = [];
let currentResultIndex = 0;
let currentRecommendedBlocks: any[][] = [];

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

const getIconForProfile = (name: string) => {
    switch (name) {
        case "Max Immersion": return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 6h16M4 10h16M4 14h16M4 18h16M8 4v16M16 4v16"></path></svg>`;
        case "Best Audio": return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14M15.54 8.46a5 5 0 0 1 0 7.07M8.46 15.54a5 5 0 0 1 0-7.07"></path></svg>`;
        case "Max Comfort": return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"></path><path d="M4 15v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"></path><path d="M2 18h20"></path></svg>`;
        case "Headache Relief": return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        default: return `<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
};

const getSubtitleForProfile = (name: string) => {
    switch (name) {
        case "Max Immersion": return "Closest to the director's view";
        case "Best Audio": return "Optimal surround sound";
        case "Max Comfort": return "Reduced neck strain";
        case "Headache Relief": return "Balanced viewing distance";
        default: return "";
    }
};

function injectStyles() {
    if (document.getElementById("seatsense-styles")) return;
    const style = document.createElement("style");
    style.id = "seatsense-styles";
    style.innerHTML = `
        #seatsense-widget {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 360px;
            background-color: #101115;
            color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            z-index: 2147483647;
            overflow: hidden;
            border: 1px solid #23252a;
            user-select: none;
        }
        .seatsense-header {
            display: flex;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #1a1c22;
        }
        .seatsense-logo {
            color: #0b73ea;
            margin-right: 12px;
            display: flex;
            align-items: center;
        }
        .seatsense-title {
            font-size: 18px;
            font-weight: 700;
            color: #e5e7eb;
        }
        .seatsense-body {
            padding: 20px;
            max-height: 1000px;
            overflow: hidden;
            transition: max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
            opacity: 1;
        }
        .seatsense-body.minimized {
            max-height: 0;
            padding-top: 0;
            padding-bottom: 0;
            opacity: 0;
            pointer-events: none;
        }
        .seatsense-section-title {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            color: #9ca3af;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
        }
        .seatsense-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }
        .seatsense-card {
            background-color: #17191f;
            border: 1px solid #23252a;
            border-radius: 12px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
        }
        .seatsense-card:hover {
            background-color: #1c1e26;
            border-color: #3b3f4a;
        }
        .seatsense-card.active {
            background-color: #151d2f;
            border-color: #4d78ff;
        }
        .seatsense-card-icon {
            color: #9ca3af;
            margin-bottom: 12px;
        }
        .seatsense-card.active .seatsense-card-icon {
            color: #8fa6ff;
        }
        .seatsense-card-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 4px;
            color: #e5e7eb;
        }
        .seatsense-card-subtitle {
            font-size: 11px;
            color: #6b7280;
            line-height: 1.4;
        }
        .seatsense-tickets {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #17191f;
            border: 1px solid #23252a;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 24px;
        }
        .seatsense-tickets-info p {
            font-size: 15px;
            font-weight: 600;
            margin: 0;
            color: #8fa6ff;
        }
        .seatsense-tickets-controls {
            display: flex;
            background-color: #23252a;
            border-radius: 20px;
            align-items: center;
        }
        .seatsense-ticket-btn {
            background: none;
            border: none;
            color: #9ca3af;
            width: 32px;
            height: 32px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .seatsense-ticket-btn:hover {
            color: #ffffff;
        }
        .seatsense-ticket-divider {
            width: 1px;
            height: 16px;
            background-color: #3b3f4a;
        }
        .seatsense-result {
            background-color: #17191f;
            border: 1px solid #23252a;
            border-radius: 12px;
            padding: 16px;
            position: relative;
        }
        .seatsense-result-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .seatsense-result-seats h3 {
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 4px 0;
            color: #e5e7eb;
        }
        .seatsense-result-seats p {
            font-size: 13px;
            color: #6b7280;
            margin: 0;
        }
        .seatsense-result-score {
            text-align: right;
        }
        .seatsense-score-badge {
            background-color: #2a3045;
            color: #8fa6ff;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
        .seatsense-score-value {
            font-size: 16px;
            font-weight: 700;
            margin-top: 4px;
            color: #e5e7eb;
        }
        .seatsense-score-label {
            font-size: 10px;
            color: #6b7280;
        }
        .seatsense-progress-bg {
            height: 4px;
            background-color: #23252a;
            border-radius: 2px;
            width: 100%;
        }
        .seatsense-progress-fill {
            height: 100%;
            background-color: #6b8cff;
            border-radius: 2px;
            transition: width 0.3s ease;
        }
        @keyframes seatsenseSlideRight {
            from { opacity: 0; transform: translateX(8px); }
            to { opacity: 1; transform: translateX(0); }
        }
        @keyframes seatsenseSlideLeft {
            from { opacity: 0; transform: translateX(-8px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .seatsense-slide-right {
            animation: seatsenseSlideRight 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .seatsense-slide-left {
            animation: seatsenseSlideLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
    `;
    document.head.appendChild(style);
}

function updateResultUI(direction = 1) {
    const resultEl = document.getElementById("seatsense-result-content");
    if (!resultEl) return;

    if (topRecommendations.length === 0) {
        resultEl.innerHTML = `<p style="color: #6b7280; font-size: 13px;">No seats available.</p>`;
        return;
    }

    const bestBlock = topRecommendations[currentResultIndex];
    if (!bestBlock || bestBlock.length === 0) return;
    const firstSeat = bestBlock[0];
    const lastSeat = bestBlock[bestBlock.length - 1];

    const seatText = bestBlock.length > 1
        ? `Seats ${firstSeat.seatNumber}-${lastSeat.seatNumber}`
        : `Seat ${firstSeat.seatNumber}`;

    const scoreVal = bestBlock[0].score || 0;
    const progressWidth = Math.min(100, Math.max(0, scoreVal));
    const badgeText = currentResultIndex === 0 ? "1st Best" : currentResultIndex === 1 ? "2nd Best" : "3rd Best";
    const animClass = direction === 1 ? "seatsense-slide-right" : "seatsense-slide-left";

    // Update seating chart highlight to match active index
    clearHighlights();
    const currentBlockElements = currentRecommendedBlocks[currentResultIndex];
    if (currentBlockElements) {
        const color = currentResultIndex === 0 ? "red" : currentResultIndex === 1 ? "orange" : "green";
        currentBlockElements.forEach((seat: any) => {
            if (seat.element) {
                seat.element.style.backgroundColor = color;
                seat.element.style.color = "white";
                seat.element.style.border = `2px solid ${color}`;
                seat.element.style.boxShadow = "none";
                seat.element.style.zIndex = "10";
                seat.element.style.position = "relative";
                seat.element.title = `Recommended (Rank ${currentResultIndex + 1}) - Score: ${Number(seat.score).toFixed(1)}`;
                currentlyHighlighted.push(seat.element);
            }
        });
    }

    resultEl.innerHTML = `
        <div class="${animClass}">
            <div class="seatsense-result-header">
                <div class="seatsense-result-seats">
                    <h3>Row ${firstSeat.row}</h3>
                    <p>${seatText}</p>
                </div>
                <div class="seatsense-result-score">
                    <span class="seatsense-score-badge">${badgeText}</span>
                    <div class="seatsense-score-value">${Math.round(scoreVal)}%</div>
                    <div class="seatsense-score-label">Confidence Match</div>
                </div>
            </div>
            <div class="seatsense-progress-bg" style="margin-bottom: 12px;">
                <div class="seatsense-progress-fill" style="width: ${progressWidth}%"></div>
            </div>
        </div>
        <div class="seatsense-result-nav" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #23252a; padding-top: 12px;">
            <button id="seatsense-prev-btn" style="background: none; border: none; color: ${currentResultIndex > 0 ? '#8fa6ff' : '#4b5563'}; cursor: ${currentResultIndex > 0 ? 'pointer' : 'default'}; display: flex; align-items: center; gap: 4px; font-size: 11px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg> Previous
            </button>
            <span style="font-size: 11px; color: #9ca3af;">${currentResultIndex + 1} of ${topRecommendations.length}</span>
            <button id="seatsense-next-btn" style="background: none; border: none; color: ${currentResultIndex < topRecommendations.length - 1 ? '#8fa6ff' : '#4b5563'}; cursor: ${currentResultIndex < topRecommendations.length - 1 ? 'pointer' : 'default'}; display: flex; align-items: center; gap: 4px; font-size: 11px;">
                Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
        </div>
    `;

    const prevBtn = document.getElementById("seatsense-prev-btn");
    const nextBtn = document.getElementById("seatsense-next-btn");
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentResultIndex > 0) {
                currentResultIndex--;
                updateResultUI(-1);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentResultIndex < topRecommendations.length - 1) {
                currentResultIndex++;
                updateResultUI(1);
            }
        };
    }
}

function addToggleUI(screenType: string, isSupported: boolean) {
    if (document.getElementById("seatsense-widget")) return;

    console.log("SeatSense: Injecting toggle UI into page");
    injectStyles();

    const container = document.createElement("div");
    container.id = "seatsense-widget";

    let screenTypeLogo = "";
    const typeUpper = (screenType || "").toUpperCase();
    if (typeUpper.includes("IMAX")) {
        screenTypeLogo = `<img src="${imaxBase64}" height="36" alt="IMAX" />`;
    } else if (typeUpper.includes("4DX")) {
        screenTypeLogo = `<img src="${logo4dxBase64}" height="36" alt="4DX" />`;
    } else if (typeUpper.includes("MX4D")) {
        screenTypeLogo = `<img src="${mx4dBase64}" height="36" alt="MX4D" />`;
    } else if (typeUpper.includes("SCREENX")) {
        screenTypeLogo = `<img src="${screenxBase64}" height="36" alt="ScreenX" />`;
    }

    // Header
    const header = document.createElement("div");
    header.className = "seatsense-header";
    header.innerHTML = `
        <div class="seatsense-logo" style="margin-right: 12px; display: flex; align-items: center;">
            <img src="${iconBase64}" width="32" height="32" alt="SeatSense Logo" />
        </div>
        <div class="seatsense-title" style="display: flex; align-items: center; width: 100%;">
            SeatSense
            <div style="margin-left: auto; display: flex; align-items: center; gap: 12px;">
                ${screenTypeLogo}
                <button id="seatsense-minimize-btn" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; display: flex; align-items: center; border-radius: 4px; transition: color 0.2s;" onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='#9ca3af'">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    `;
    container.appendChild(header);

    const body = document.createElement("div");
    body.className = "seatsense-body";
    
    const minimizeBtn = header.querySelector("#seatsense-minimize-btn");
    let isMinimized = false;
    minimizeBtn?.addEventListener("click", () => {
        isMinimized = !isMinimized;
        body.classList.toggle("minimized", isMinimized);
        minimizeBtn.innerHTML = isMinimized 
            ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>` 
            : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    });

    if (!isSupported) {
        body.innerHTML = `<p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 20px 0;">Coming soon for ${screenType || 'this screen type'}!</p>`;
        container.appendChild(body);
        document.body.appendChild(container);
        return;
    }

    // Recommendation Mode Grid
    const modeSection = document.createElement("div");
    const modeTitle = document.createElement("div");
    modeTitle.className = "seatsense-section-title";
    modeTitle.innerText = "RECOMMENDATION MODE";
    modeSection.appendChild(modeTitle);

    const grid = document.createElement("div");
    grid.className = "seatsense-grid";

    Object.keys(PROFILES).forEach(p => {
        const card = document.createElement("div");
        card.className = "seatsense-card" + (currentProfile.name === p ? " active" : "");
        card.innerHTML = `
            <div class="seatsense-card-icon">${getIconForProfile(p)}</div>
            <div class="seatsense-card-title">${p}</div>
            <div class="seatsense-card-subtitle">${getSubtitleForProfile(p)}</div>
        `;

        card.onclick = () => {
            currentProfile = PROFILES[p];
            grid.querySelectorAll(".seatsense-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            clearHighlights();
            highlightSeats();
            updateResultUI();
        };
        grid.appendChild(card);
    });
    modeSection.appendChild(grid);
    body.appendChild(modeSection);

    // Tickets
    const ticketsSection = document.createElement("div");
    ticketsSection.className = "seatsense-tickets";

    const tInfo = document.createElement("div");
    tInfo.className = "seatsense-tickets-info";
    tInfo.innerHTML = `
        <h4 style="font-size: 11px; color: #9ca3af; text-transform: uppercase; margin: 0 0 4px 0;">TICKETS</h4>
        <p id="seatsense-ticket-count-text">${currentTicketCount} Ticket${currentTicketCount > 1 ? 's' : ''}</p>
    `;

    const tControls = document.createElement("div");
    tControls.className = "seatsense-tickets-controls";

    const minusBtn = document.createElement("button");
    minusBtn.className = "seatsense-ticket-btn";
    minusBtn.innerText = "−";

    const divider = document.createElement("div");
    divider.className = "seatsense-ticket-divider";

    const plusBtn = document.createElement("button");
    plusBtn.className = "seatsense-ticket-btn";
    plusBtn.innerText = "+";

    const updateTickets = (newVal: number) => {
        if (newVal < 1 || newVal > 10) return;
        currentTicketCount = newVal;
        document.getElementById("seatsense-ticket-count-text")!.innerText = `${currentTicketCount} Ticket${currentTicketCount > 1 ? 's' : ''}`;
        clearHighlights();
        highlightSeats();
        updateResultUI();
    };

    minusBtn.onclick = () => updateTickets(currentTicketCount - 1);
    plusBtn.onclick = () => updateTickets(currentTicketCount + 1);

    tControls.appendChild(minusBtn);
    tControls.appendChild(divider);
    tControls.appendChild(plusBtn);

    ticketsSection.appendChild(tInfo);
    ticketsSection.appendChild(tControls);
    body.appendChild(ticketsSection);

    // Result Section
    const resultSection = document.createElement("div");
    resultSection.className = "seatsense-result";
    resultSection.id = "seatsense-result-content";
    body.appendChild(resultSection);

    container.appendChild(body);
    document.body.appendChild(container);

    updateResultUI();
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

    currentRecommendedBlocks = recommendedBlocks;

    highlighted = true;
    currentResultIndex = 0;
    addToggleUI(screenType, true);
    updateResultUI();
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
        const container = document.getElementById("seatsense-widget");
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
        const container = document.getElementById("seatsense-widget");
        if (container) container.remove();
        topRecommendations = []; // clear old recommendations
    }
}).observe(document, { subtree: true, childList: true });

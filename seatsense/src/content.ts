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
let currentTicketCount = 1;
let currentlyHighlighted: HTMLElement[] = [];
let activeProfileName = "Max Immersion";
let currentRecommendationIndex = 0;

const MODE_COLORS: Record<string, string> = {
    "Max Comfort": "#22c55e",      // Green
    "Best Audio": "#3b82f6",   // Blue
    "Max Immersion": "#a855f7",// Purple
    "Headache Relief": "#f97316"// Orange
};



let tooltipEl: HTMLElement | null = null;

function showTooltip(e: MouseEvent) {
    if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.id = "seatsense-tooltip";
        document.body.appendChild(tooltipEl);
    }
    const target = e.currentTarget as HTMLElement;
    const text = target.getAttribute("data-seatsense-tooltip");
    if (text) {
        tooltipEl.innerHTML = text;
        tooltipEl.style.display = "block";
        const rect = target.getBoundingClientRect();
        // position above the seat
        tooltipEl.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
        tooltipEl.style.top = `${rect.top + window.scrollY - 10}px`;
    }
}

function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.style.display = "none";
    }
}

function clearHighlights(resetFlag = false) {
    currentlyHighlighted.forEach(el => {
        el.style.border = "";
        el.style.boxShadow = "";
        el.style.backgroundColor = "";
        el.style.color = "";
        el.style.zIndex = "";
        el.style.position = "";
        el.title = "";
        el.removeAttribute("data-seatsense-tooltip");
        el.removeEventListener("mouseenter", showTooltip);
        el.removeEventListener("mouseleave", hideTooltip);
    });
    currentlyHighlighted = [];
    if (resetFlag) {
        highlighted = false;
    }
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

        #seatsense-tooltip {
            position: absolute;
            background: #17191f;
            color: #ffffff;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-family: 'Inter', -apple-system, sans-serif;
            pointer-events: none;
            z-index: 2147483647;
            transform: translate(-50%, -100%);
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            border: 1px solid #23252a;
            display: none;
            line-height: 1.5;
        }
    `;
    document.head.appendChild(style);
}

function addToggleUI(screenType: string, isSupported: boolean) {
    const existingWidget = document.getElementById("seatsense-widget");
    if (existingWidget) {
        if (isSupported && !document.getElementById("seatsense-result-content")) {
            // Upgrade from unsupported to supported
            existingWidget.remove();
        } else {
            return;
        }
    }

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
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </button>
            </div>
        </div>
    `;
    container.appendChild(header);

    const body = document.createElement("div");
    body.className = "seatsense-body minimized";
    
    const minimizeBtn = header.querySelector("#seatsense-minimize-btn");
    let isMinimized = true;
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

    // Recommendation Mode Legend
    const modeSection = document.createElement("div");
    const modeTitle = document.createElement("div");
    modeTitle.className = "seatsense-section-title";
    modeTitle.innerText = "RECOMMENDATION LEGEND";
    modeSection.appendChild(modeTitle);

    const grid = document.createElement("div");
    grid.className = "seatsense-grid";

    Object.keys(PROFILES).forEach(p => {
        const color = MODE_COLORS[p] || "#ffffff";
        const isActive = p === activeProfileName;
        const card = document.createElement("div");
        card.className = "seatsense-card" + (isActive ? " active" : "");
        card.dataset.profile = p;
        card.style.cursor = "pointer";
        card.style.borderColor = isActive ? color : `${color}40`;
        
        // Add a subtle background tint
        card.style.backgroundColor = `${color}10`;
        
        card.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div class="seatsense-card-icon" style="color: ${color}">${getIconForProfile(p)}</div>
                <div style="width: 10px; height: 10px; border-radius: 50%; background-color: ${color}; box-shadow: 0 0 8px ${color}80;"></div>
            </div>
            <div class="seatsense-card-title">${p}</div>
            <div class="seatsense-card-subtitle">${getSubtitleForProfile(p)}</div>
        `;
        
        card.onclick = () => {
            if (activeProfileName === p) return;
            activeProfileName = p;
            currentRecommendationIndex = 0;
            
            // Update active state on UI
            document.querySelectorAll(".seatsense-card").forEach(el => {
                const ep = (el as HTMLElement).dataset.profile;
                const ec = MODE_COLORS[ep!] || "#ffffff";
                if (ep === activeProfileName) {
                    el.classList.add("active");
                    (el as HTMLElement).style.borderColor = ec;
                } else {
                    el.classList.remove("active");
                    (el as HTMLElement).style.borderColor = `${ec}40`;
                }
            });
            
            updateResults();
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
        currentRecommendationIndex = 0;
        document.getElementById("seatsense-ticket-count-text")!.innerText = `${currentTicketCount} Ticket${currentTicketCount > 1 ? 's' : ''}`;
        clearHighlights(true);
        highlightSeats();
        updateResults();
    };

    minusBtn.onclick = () => updateTickets(currentTicketCount - 1);
    plusBtn.onclick = () => updateTickets(currentTicketCount + 1);

    tControls.appendChild(minusBtn);
    tControls.appendChild(divider);
    tControls.appendChild(plusBtn);

    ticketsSection.appendChild(tInfo);
    ticketsSection.appendChild(tControls);
    body.appendChild(ticketsSection);

    const resultsContainer = document.createElement("div");
    resultsContainer.id = "seatsense-results-container";
    body.appendChild(resultsContainer);

    container.appendChild(body);
    document.body.appendChild(container);

    updateResults();
}

function updateResults(direction: 'left' | 'right' | 'none' = 'none') {
    const resultsContainer = document.getElementById("seatsense-results-container");
    if (!resultsContainer) return;

    const parser = new PVRParser();
    const seats = parser.parseSeats();
    const availableSeats = seats.filter(s => s.available);
    if (availableSeats.length === 0) {
        resultsContainer.innerHTML = "";
        return;
    }

    const profile = PROFILES[activeProfileName];
    if (!profile) return;

    const blocks = recommendSeats(availableSeats, profile, currentTicketCount).slice(0, 3);
    if (blocks.length === 0) {
        resultsContainer.innerHTML = "";
        return;
    }
    
    // Ensure index is within bounds
    if (currentRecommendationIndex >= blocks.length) {
        currentRecommendationIndex = 0;
    }

    const block = blocks[currentRecommendationIndex];
    const index = currentRecommendationIndex;
    
    const score = block[0].score ? Math.round(Number(block[0].score)) : 0;
    const rowStr = block[0].row;
    const minCol = Math.min(...block.map(s => Number(s.seatNumber)));
    const maxCol = Math.max(...block.map(s => Number(s.seatNumber)));
    const seatsStr = block.length > 1 ? `${minCol}-${maxCol}` : `${minCol}`;
    
    const badgeText = index === 0 ? "1st Best" : index === 1 ? "2nd Best" : "3rd Best";
    const animClass = direction === 'left' ? 'seatsense-slide-left' : direction === 'right' ? 'seatsense-slide-right' : '';
    
    const resultHtml = `
        <div class="seatsense-result ${animClass}" style="margin-bottom: 0;">
            <div class="seatsense-result-header">
                <div class="seatsense-result-seats">
                    <h3>Row ${rowStr}</h3>
                    <p>Seats ${seatsStr}</p>
                </div>
                <div class="seatsense-result-score">
                    <div class="seatsense-score-badge">${badgeText}</div>
                    <div class="seatsense-score-value">${score}%</div>
                    <div class="seatsense-score-label">Confidence Match</div>
                </div>
            </div>
            <div class="seatsense-progress-bg">
                <div class="seatsense-progress-fill" style="width: ${score}%;"></div>
            </div>
        </div>
    `;
    resultsContainer.innerHTML = resultHtml;

    if (blocks.length > 1) {
        const arrowContainer = document.createElement("div");
        arrowContainer.style.display = "flex";
        arrowContainer.style.justifyContent = "center";
        arrowContainer.style.gap = "16px";
        arrowContainer.style.marginTop = "8px";
        
        const createArrow = (isLeft: boolean) => {
            const btn = document.createElement("button");
            btn.style.background = "none";
            btn.style.border = "none";
            btn.style.color = "#9ca3af";
            btn.style.cursor = "pointer";
            btn.style.padding = "4px";
            btn.style.transition = "color 0.2s ease, transform 0.2s ease";
            btn.innerHTML = isLeft ? `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            ` : `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
            `;
            
            btn.onmouseover = () => {
                btn.style.color = "#ffffff";
                btn.style.transform = isLeft ? "translateX(-2px)" : "translateX(2px)";
            };
            btn.onmouseout = () => {
                btn.style.color = "#9ca3af";
                btn.style.transform = "translateX(0)";
            };
            btn.onclick = () => {
                if (isLeft) {
                    currentRecommendationIndex = (currentRecommendationIndex - 1 + blocks.length) % blocks.length;
                    updateResults('left');
                } else {
                    currentRecommendationIndex = (currentRecommendationIndex + 1) % blocks.length;
                    updateResults('right');
                }
            };
            return btn;
        };

        arrowContainer.appendChild(createArrow(true));
        arrowContainer.appendChild(createArrow(false));
        resultsContainer.appendChild(arrowContainer);
    }
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

    clearHighlights(false);

    // Track all recommendations so we can handle overlaps
    // seat element -> array of recommendation reasons
    const seatRecs = new Map<HTMLElement, { mode: string, rank: number, color: string }[]>();

    Object.keys(PROFILES).forEach(profileName => {
        const profile = PROFILES[profileName];
        const blocks = recommendSeats(availableSeats, profile, currentTicketCount).slice(0, 3);
        const color = MODE_COLORS[profileName] || "#ffffff";
        
        blocks.forEach((block, index) => {
            block.forEach(seat => {
                if (seat.element) {
                    if (!seatRecs.has(seat.element)) {
                        seatRecs.set(seat.element, []);
                    }
                    seatRecs.get(seat.element)!.push({
                        mode: profileName,
                        rank: index + 1,
                        color: color
                    });
                }
            });
        });
    });

    // Apply styles to all recommended seats
    seatRecs.forEach((recs, element) => {
        // If a seat satisfies multiple modes, we just use the first mode's color for the background
        // The tooltip will show all of them.
        const primaryColor = recs[0].color;
        
        element.style.backgroundColor = primaryColor;
        element.style.color = "white";
        element.style.border = `2px solid ${primaryColor}`;
        element.style.boxShadow = "none";
        element.style.zIndex = "10";
        element.style.position = "relative";
        
        // Build tooltip HTML
        const tooltipLines = recs.map(r => {
            const rankStr = r.rank === 1 ? "1st Best" : r.rank === 2 ? "2nd Best" : "3rd Best";
            return `<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${r.color};margin-right:6px;"></span><strong>${rankStr}</strong> for ${r.mode}</div>`;
        });
        
        element.setAttribute("data-seatsense-tooltip", tooltipLines.join(""));
        element.addEventListener("mouseenter", showTooltip);
        element.addEventListener("mouseleave", hideTooltip);
        
        currentlyHighlighted.push(element);
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
let debounceTimer: any = null;
const observer = new MutationObserver(() => {
    const hasSeats = document.querySelector(".seats-row");

    if (hasSeats) {
        if (!highlighted) {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (document.querySelector(".seats-col span[id]")) {
                    highlightSeats();
                }
            }, 300);
        }
    } else {
        // Remove UI if seat arrangement is not on screen (e.g. user is on timings page)
        const container = document.getElementById("seatsense-widget");
        if (container) {
            container.remove();
            clearHighlights(true);
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Check for SPA navigation to reset the highlighter if the user changes showtimes
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        clearHighlights(true);
        const container = document.getElementById("seatsense-widget");
        if (container) container.remove();
        topRecommendations = []; // clear old recommendations
    }
}).observe(document, { subtree: true, childList: true });

import { useEffect, useState } from "react"

function IndexPopup() {
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Query active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: "GET_RECOMMENDATIONS" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Content script not found or not loaded yet.");
          } else if (response && response.recommendations) {
            setRecommendations(response.recommendations);
          }
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [])

  return (
    <div style={{ padding: 16, minWidth: 250, fontFamily: "sans-serif" }}>
      <h2 style={{ borderBottom: "1px solid #ccc", paddingBottom: 8, margin: "0 0 12px 0" }}>SeatSense</h2>
      <p style={{ fontSize: 14, color: "#555", margin: "0 0 12px 0" }}>Top Recommended Seats:</p>
      
      {loading ? (
        <p>Loading...</p>
      ) : recommendations.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {recommendations.map((seat, index) => (
            <li key={index} style={{ 
              marginBottom: 10, 
              padding: 10, 
              borderRadius: 6, 
              backgroundColor: index === 0 ? "#fff8e1" : index === 1 ? "#fafafa" : "#f5f5f5",
              border: `1px solid ${index === 0 ? "#ffd54f" : index === 1 ? "#ccc" : "#ddd"}`
            }}>
              <strong style={{ color: index === 0 ? "#d4af37" : index === 1 ? "#777" : "#a0522d" }}>
                {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"} Rank {index + 1}
              </strong>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                Row: <strong>{seat.row}</strong> | Seat: <strong>{seat.seatNumber}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>
                Category: {seat.category} | Score: {Number(seat.score).toFixed(1)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, color: "#999", lineHeight: 1.4 }}>
          No recommendations found. Make sure you are on a PVR booking page and seats have loaded.
        </p>
      )}
    </div>
  )
}

export default IndexPopup

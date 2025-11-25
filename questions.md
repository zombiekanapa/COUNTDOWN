# Project Clarification Questions

You requested that I ask questions before executing. Since I must generate the code in this response, I have built a prototype based on "Safe Assumptions" (Option A below).

To refine this for your final public release, please review these questions:

## 1. Map Provider & Cost
**My Assumption:** I used **Leaflet (OpenStreetMap)**.
*   **Question:** Do you strictly require the **Google Maps JavaScript API**?
*   **Implication:** Google Maps API requires a Google Cloud billing account (credit card) and API Key. Leaflet is free and works perfectly on GitHub Pages.

## 2. Data Persistence (Saving Markers)
**My Assumption:** I used **Local Storage**.
*   **Question:** How do you want markers to be shared?
*   **Implication:**
    *   *Local Storage:* Only YOU see the markers you add.
    *   *Static JSON:* You manually update a `.json` file in the code for everyone to see (hardcoded).
    *   *Real Backend:* Requires Firebase/Supabase (more complex setup) if you want users to add markers that everyone else sees instantly.

## 3. Gemini AI Role
**My Assumption:** I used Gemini to **generate descriptions** for the evacuation spots based on their coordinates and name.
*   **Question:** Did you want Gemini to analyze the map visually, or just help with text?

## 4. The "Nuclear" Symbol ☢
**My Assumption:** I styled the app with a "Civil Defense / Hazard" aesthetic (Yellow/Black/Red).
*   **Question:** Is this for a serious civil defense project or a simulation/game? This affects the tone of the AI text generation.

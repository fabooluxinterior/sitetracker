# SiteTrack

A fast, mobile-first coordinator site-visit app.

## Included workflow

1. On open, request GPS. If GPS is already allowed, the prompt is skipped and the location status is shown.
2. Create a client or select a customer from the last 30 days.
3. Search the complete project history with no 30-day restriction.
4. Capture a selfie with timestamp and the most recent GPS coordinates.
5. Upload multiple site pictures and record pending works.
6. Enter workers as a number only.
7. Automatically count one working day per coordinator + site + calendar date, even if the coordinator checks in several times that day. The project limit is 15 days.
8. Save locally first, then sync to Google Sheets when the endpoint is configured. If the network fails, the visit remains in the device queue instead of being lost.

## Connect Google Sheets

A starter destination sheet has been created here: https://docs.google.com/spreadsheets/d/1Kcu-Gchtzqej2YergFCOTAkKqUH6ZA4hbjbJXfmFyvM

1. Open the starter sheet above (or use your own sheet). Create a blank Google Sheet.
2. Open **Extensions → Apps Script**.
3. Paste `Code.gs` and save.
4. Run `setup()` once and approve Google permissions. This creates clean `Visits` and `Customers` tabs and a `SiteTrack Uploads` Drive folder.
5. Deploy → New deployment → Web app.
6. Set **Execute as:** Me. Set access to the intended users (for a simple pilot, “Anyone with the link”).
7. Copy the `/exec` URL.
8. In the app, set the endpoint in the browser console:

```js
localStorage.setItem('sitetrack_api_url', 'PASTE_YOUR_EXEC_URL_HERE');
location.reload();
```

The app sends visits to `POST /exec`, and uses these read endpoints:

- `?action=customers` — recent customer list
- `?action=search&q=...` — all-time customer search
- `?action=days_used&coordinatorId=...&customerId=...` — working-day history

## Run locally

For camera and GPS, serve the file over `https` or `http://localhost` rather than opening it directly from `file://`. For example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/site-tracking-app.html` on the device or use an HTTPS deployment.

## Important production hardening

- Use Google sign-in or a proper coordinator identity instead of the demo coordinator ID.
- Restrict the Apps Script deployment to your organization or authenticated users.
- Add a retention policy and access controls for selfies and site images.
- For large teams, move image storage and data writes to a proper backend instead of sending base64 images directly through Apps Script.
- Test GPS, camera, offline queue, and sheet permissions on the actual Android/iOS devices before rollout.

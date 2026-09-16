# SiteTrack

A fast, mobile-first coordinator site-session app with a white-and-orange interface.

## Live app

https://fabooluxinterior.github.io/sitetracker/

## Included workflow

- Email/password login backed by the Google Sheet Credentials tab.
- Coordinator home showing active sites and a one-tap site login or logout action.
- Multiple sites can be active at the same time.
- Site login captures GPS, a location label, time, workers, and a login selfie.
- Site logout requires a fresh GPS reading and selfie; logout is rejected when location is unavailable.
- GPS location is reverse-geocoded to a readable place label when the browser can reach the geocoder, with a coordinate fallback.
- Recent customer list is limited to 30 days; all-time project search is available separately.
- One working day is counted per coordinator + site + calendar date, with a 15-day limit.
- Admin panel filters visit data by project, coordinator, and date. Admins can add or edit users in the Credentials tab.
- Site image uploads and pending-work text uploads were removed from this version.

## Google Sheets backend

Destination sheet: https://docs.google.com/spreadsheets/d/1Kcu-Gchtzqej2YergFCOTAkKqUH6ZA4hbjbJXfmFyvM

The bound Apps Script backend uses these tabs:

- Visits — login/logout session records, GPS, workers, dates, and selfie URLs.
- Customers — project/customer index and recent-visit information.
- Credentials — Email, Password, Role, Display Name, Active, Updated At.

After pasting Code.gs into the bound Apps Script project, run setup() once. The first run seeds an admin row using the Google account that owns the script and a generated password. Change that password immediately in Credentials.

Deploy it as a web app with Execute as the owner and access set to the intended users. The current deployment endpoint is already wired into index.html and site-tracking-app.html.

## Security note

This pilot stores passwords in the Credentials sheet as requested. For production, migrate to Google sign-in or a managed identity provider and restrict the Apps Script deployment. Selfies are stored in the SiteTrack Uploads Drive folder.

## Run locally

Serve the files over HTTPS or localhost so browser camera and GPS permissions work:

```bash
python -m http.server 8080
```


Storage tabs: `VisitsV3`, `CustomersV3`, and `Credentials`. Legacy `Visits` and `Customers` tabs are preserved.

# SiteTrack v2

SiteTrack is a coordinator site-session tracker with mandatory GPS and selfie verification.

## Live application

https://fabooluxinterior.github.io/sitetracker/

## New database

Google Sheet: https://docs.google.com/spreadsheets/d/1cq5aTDi7W8FUs3WWmi46Sjk0rxZmaudclt3x8u29Idc

Tabs:

- `Visits` — every site login/logout session, working day, time, location, worker count, selfie links, and logout comments.
- `Sites` — site directory and visit totals.
- `Users` — coordinator and admin credentials.

The previous SiteTrack spreadsheet is intentionally preserved as a backup and is not used by v2.

## Workflow

1. Sign in with email and password.
2. Choose `Login site`.
3. Enter site name, site location, and number of workers.
4. Allow camera and location access and capture the required selfie.
5. Review the working-day box and fixed 15-day total.
6. Confirm the site login.
7. Home shows all currently active sites.
8. `Logout site` opens a site selector, then requires a fresh selfie and location. Logout comment is optional.
9. The server timestamp is saved with every event.

Working days count distinct calendar dates for the same coordinator and site. Multiple sessions on one date remain the same working-day number.

## Admin

Admins can search and sort all sessions by site, coordinator, date, newest, oldest, site name, or coordinator. The table includes coordinator identity, workers, working day, login/logout times, locations, GPS coordinates, selfie links, and logout comments.

Admins can add or edit coordinators and admins from the Users tab.

## Deployment

1. Create or open the Apps Script project bound to the new spreadsheet.
2. Paste `Code.gs` into the project.
3. Run `setup()` once to apply headers and formatting.
4. Deploy as a web app running as the owner with access set to Anyone.
5. Put the deployment URL in the `API` constant in `site-tracking-app.html`.
6. Publish `site-tracking-app.html` as `index.html` on GitHub Pages.

The repository source is split into `site-tracking-app.html`, `index.html`, `Code.gs`, and this README.

## Initial administrator

- Email: `designer8fab@gmail.com`
- Temporary password: `ST-Admin-V2-2026!`

Change the temporary password immediately. Passwords are currently stored in the Users sheet for this pilot workflow; use a proper authentication provider before production use.

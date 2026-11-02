# Kaytia POS + Back Office v1.8.0

Kaytia Smart ERP: **POS** (till), **Front Desk** (rooms, bookings, folios) and **Back Office** (reports, inventory, staff, credit).
`src/` holds the editable parts. The build joins them into one HTML file in `dist/`.
The original minified file is kept in `original/` for reference. The sources were reformatted with Prettier
(on 31 Oct 2026); the build at that point was verified to be equivalent to the original (same JS syntax trees,
same CSS, same markup), it just isn't byte-for-byte identical any more. The Back Office was then split from one
`app.js` into 10 files, verified the same way.

## Structure

```
kaytia-pos-backoffice/
├─ src/                                   <- edit here
│  ├─ index.html                          markup for every screen + the ORDER files load in
│  ├─ assets/
│  │  └─ logo.png
│  ├─ css/                                loaded top to bottom (later files override earlier ones)
│  │  ├─ base.css                         theme variables, reset, buttons, modals, tables, print
│  │  ├─ pos.css                          PIN login, till, receipt roll, receipt panel, toolbar
│  │  ├─ auth-screens.css                 Back Office login and brand panel
│  │  ├─ back-office-shell.css            Back Office shell: layout, panels, tables, body
│  │  ├─ start-screen.css                 start menu (POS / Back Office / Front Desk)
│  │  ├─ shift-manager.css                back button, card swipe, shift screen, shift print
│  │  ├─ front-desk.css                   Front Desk login, rooms, folios, housekeeping
│  │  ├─ back-office-pages.css            inventory, reports, themes, popovers
│  │  └─ pos-five-star.css                POS look: menu card, guest check, brass accents (skin only; loads last)
│  └─ js/                                 plain scripts sharing one global scope, loaded in index.html order
│     ├─ pos/
│     │  ├─ catalog-stock.js              tax, stores, ingredients, menu items
│     │  ├─ cart-sale.js                  departments, categories, grid, cart, find item, kitchen messages
│     │  ├─ payment.js                    cash / M-Pesa / credit payment, receipt QR
│     │  ├─ orders.js                     send order now, bill later, open orders
│     │  ├─ exchange.js                   swap one item for another
│     │  ├─ slips.js      guest bill, receipt, kitchen and bar order slips
│     │  ├─ printers.js   sends order tickets to their printers through the server
│     │  ├─ bill-options.js  edit, discount, void, merge, split, price list, currency
│     │  ├─ login-session.js              cashier PIN login, card swipe, fullscreen, exit
│     │  └─ shift-screen.js               POS shift management screen
│     ├─ shared/
│     │  └─ business-day.js               business day, shifts, payouts, printable reports (POS + Back Office)
│     ├─ front-desk/
│     │  ├─ data.js                       room data, seed, helpers, state
│     │  ├─ rooms-meals-invoices.js       room panel, meals, invoices
│     │  ├─ room-types.js                 room types, rates, profiles
│     │  ├─ group-bookings.js             group bookings, group check-in, group payments
│     │  ├─ guests-housekeeping.js        guest register, ID documents, housekeeping
│     │  ├─ views.js                      all Front Desk screens (FD_VIEWS)
│     │  ├─ screen-and-login.js           draw, open/exit, Front Desk login
│     │  └─ actions.js                    payments and every click action
│     └─ back-office/                     one private group (see "Rules" below), loaded in this order:
│        ├─ core.js                       stock view over the stores, shared state, helpers, save/load, admin account
│        ├─ periods-and-nav.js            date windows (this / previous period), side navigation
│        ├─ home-dashboard.js             KPIs, module tiles, trend, donut, insights, approvals, activity
│        ├─ reports.js                    sales reports, rooms reports, report tiles, day bar
│        ├─ inventory.js                  stores, item setup, receive, LPOs, requisitions, issue, transfer, damage, stock master
│        ├─ receive.js                    Direct Receive form (goods received, VAT, batch/expiry, LPO loading) + vendor setup
│        ├─ purchasing.js                 Purchasing menu: purchase orders (LPO), receive goods, purchases report
│        ├─ vendors.js                    People → Vendors: vendor list, vendor statements, payments to vendors
│        ├─ approvals.js                  manager approval (PIN) of purchase orders, requisitions and issue notes
│        ├─ inventory-reports.js          inventory reports: purchases, issues, damages (daily/weekly/monthly/yearly cost)
│        ├─ stock-take-report.js          stock taking report (after each count, printable), variance report, stock take history, search boxes
│        ├─ production.js                 Recipes & Production: kitchen materials, production batches, recipes
│        ├─ selling-points.js             selling points (bars, restaurants, kitchens, shops): create, products, stock, staff
│        ├─ navigation.js                 page titles, render(), go()
│        ├─ demo-data.js                  seed(): sample sales
│        ├─ page-actions.js               clicks and edits inside the sub pages
│        ├─ top-bar-and-themes.js         period / sale point pickers, bell, search (Ctrl K), themes
│        └─ login-and-startup.js          Back Office login, start menu, startup calls
├─ scripts/build.js                       joins src/ into one HTML file
├─ scripts/dev.js                         dev server with live reload (npm run dev)
├─ build.bat                              double-click on Windows to build
├─ dist/Kaytia_POS_BackOffice_v1_8_0.html built output, the file you deploy
├─ original/Kaytia_POS_BackOffice_v1_8_0.html   untouched original, for comparing
├─ .vscode/                               extension list, build + dev tasks, format on save
├─ .prettierrc.json  .prettierignore      code formatting rules
├─ package.json  .editorconfig  .gitignore
```

## Work on it

1. In VS Code, **File -> Open Folder** and choose the `kaytia-pos-backoffice` folder (the one containing `src` and `package.json`).
2. Install the recommended extensions, and run `npm install` once in a terminal.
3. Run `npm run dev` (or **Terminal -> Run Task -> Dev server**). It opens http://localhost:5500; edit, save, the browser reloads.
   Opening `src/index.html` directly or with Live Server does **not** work: the Back Office files only run once the build wraps them.
4. To build: double-click `build.bat`, press **Ctrl+Shift+B** in VS Code, or run `npm run build` in a terminal opened inside this folder.
5. Take the finished file from `dist/`.

### Formatting

Code is formatted with Prettier (settings in `.prettierrc.json`). Run `npm install` once, then:

- VS Code formats each file on save (Prettier extension, recommended in `.vscode/extensions.json`).
- `npm run format` formats everything in `src/`; `npm run format:check` only reports.

`index.html` is split into labelled sections (`<!-- ==== POS: till ==== -->` etc.); search for `====` to jump between screens.

## Master server (`server/`)

Backend for the offline-first setup described in `CLAUDE.md`, built one step at a time.

- `server/prisma/schema.prisma`: PostgreSQL database schema (Prisma 7). Database URL goes in `server/.env` (see `.env.example`), read by `server/prisma.config.ts`.
- `server/prisma/migrations/`: SQL migrations. Apply with `cd server` then `npm run db:migrate`.
- `npm run db:validate` / `npm run db:generate` check the schema and build the typed client.
- `npm run dev` runs the API on http://localhost:4000; `npm test` runs the tests against a separate `<db>_test` database; `npm run typecheck`.
- Code: `server/src/modules/<area>/` holds each feature as a service (logic, testable on its own) and routes (HTTP).

First run: `npm run user:create-admin -- --username admin --name "Administrator" --pin 0000` (asks for the password).

| Endpoint | What it does |
|---|---|
| `POST /api/auth/login` | Back Office sign-in: `{ username, password }` → `{ token }` |
| `POST /api/auth/pin-login` | POS / Front Desk sign-in: `{ pin }`, `{ username, pin }` or `{ cardNo }`, optional `departmentId` |
| `POST /api/auth/logout` · `GET /api/auth/me` | End the session · who is signed in |
| `PUT /api/auth/me/pin` · `PUT /api/auth/me/password` | Change own PIN (unique) / password (signs out other sessions) |
| `POST /api/auth/override` | Supervisor PIN → single-use `overrideToken` for one action (send as `x-override-token`) |
| `POST /api/stock-takes` | Start a stock take for one department or all (`departmentId: null`) |
| `PUT /api/stock-takes/:id/counts` | Enter / correct physical counts in bulk |
| `GET /api/stock-takes/:id` | Count sheet with live variance preview |
| `POST /api/stock-takes/:id/approve` | **Approve & Take All**: adjusts every counted line in one transaction |
| `POST /api/stock-takes/:id/cancel` | Cancel a stock take that is still being counted |
| `GET /api/stock-takes/:id/report` | Permanent audit report of an approved stock take |
| `POST /api/orders/:id/transfer-to-room` | Post a bill's unpaid balance to a checked-in guest's folio: `{ roomNumber, guestName }`. Repeat-safe |
| `POST /api/orders/:id/reverse-room-transfer` | Undo a room posting (wrong room); needs a supervisor override unless permitted |
| `GET /api/dashboard?from=&to=&asOf=&departmentId=` | Executive dashboard: revenue (F&B / rooms / payment mix / by department / hourly or daily chart / top items / vs previous period), occupancy, arrivals, departures, breakfast list, low stock, stock value, rule-based alerts, activity feed. Local business days (`BUSINESS_TZ`, default Africa/Nairobi) |
| `POST /api/terminals` · `GET /api/terminals` | Register a till / tablet (its key is shown once) · list terminals |
| `POST /api/terminals/:id/rotate-key` · `/deactivate` · `/activate` | Replace a lost terminal's key · switch a terminal off / on |
| `POST /api/sync/push` | **Terminal** sends its recorded operations (`x-terminal-id` + `x-terminal-key`): `pos.sale`, `stocktake.count`, `order.transfer_to_room` |
| `GET /api/sync/status` | Terminal: next sequence number to send and recent rejections |

Sync rules: operations carry their own UUID and a per-terminal sequence 1, 2, 3…; they are applied in order with no gaps, a re-sent operation is answered again but never applied twice, a bad operation is rejected (and recorded) while the rest continue, and a server fault stops the batch so the terminal retries. Sales that already happened are kept even when they break a rule (negative stock, credit limit, no shift); those come back as `warnings` for the office to review.

Every endpoint except health and the two logins needs `Authorization: Bearer <token>`. `server/.env` must contain `AUTH_SECRET` (see `.env.example`); changing it invalidates all staff PINs.

## Where do I change...

| I want to change | File |
|---|---|
| Menu items, prices, stores, tax | `js/pos/catalog-stock.js` |
| Cart, item grid, find item | `js/pos/cart-sale.js` |
| Payment methods, receipt | `js/pos/payment.js` |
| Cashier PINs, card swipe | `js/pos/login-session.js` |
| Shifts, end of day, payouts | `js/shared/business-day.js`, `js/pos/shift-screen.js` |
| Room list, seed data | `js/front-desk/data.js` |
| Rates and room types | `js/front-desk/room-types.js` |
| Front Desk screens | `js/front-desk/views.js` |
| Front Desk buttons and actions | `js/front-desk/actions.js` |
| Back Office dashboard | `js/back-office/home-dashboard.js` |
| Back Office reports | `js/back-office/reports.js` |
| Back Office inventory | `js/back-office/inventory.js` |
| Stores, local purchase orders (LPO), requisitions, issue | `js/back-office/inventory.js` (`storesHTML`, `lpoHTML`, `invAct`); store list `STORES` in `js/pos/catalog-stock.js` |
| Selling points and the products they sell on the POS | `js/back-office/selling-points.js`; list `ALLD` + `OUTLET_INFO` in `js/pos/catalog-stock.js` |
| Item setup (unit of measure, buying unit & price, send stock to a store) | `js/back-office/inventory.js` (`itemsHTML`, `itemSave`, `sendToStore`); details saved in `INGU` (`js/back-office/core.js`) |
| Back Office search, themes, top bar | `js/back-office/top-bar-and-themes.js` |
| Back Office login, saved data | `js/back-office/login-and-startup.js`, `js/back-office/core.js` |
| Colours, fonts, layout | matching file in `css/` |

## Rules to keep it working

- **Keep the script order** in `index.html`. The files are not modules; later ones use variables defined in earlier ones.
- **Blank lines in `index.html` between script groups matter.** The build merges each run of consecutive `<script src>` lines into one `<script>` block, exactly like the original (POS, shifts, Front Desk, Back Office). Each group is labelled with a comment.
- **The Back Office files are one private group.** Their `<script>` tags carry `data-private`, and the build wraps the whole group in one `(() => { ... })();`. They share names with each other (e.g. their own `$`, `toast`, `view`) but those names don't leak into, or clash with, POS and Front Desk. To add a Back Office file, add a `<script ... data-private>` line inside that group.
- **CSS order matters.** Later files override earlier ones, so don't reorder the `<link>` tags.
- Google Fonts load from the internet; everything else works offline.

## Releasing a new version

Update the version in `<title>`, the `app-version` meta tag, `APP_VERSION` in `js/front-desk/data.js`, the "v1.8.0" labels in `index.html`, and the output name in `scripts/build.js`.

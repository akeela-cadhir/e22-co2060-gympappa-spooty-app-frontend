# GympAPPa

GympAPPa is a combined sports management platform for the university gymnasium. It brings together student authentication, equipment handling, court availability, partner finding, role workflows, and staff/admin tools in one app.

This README documents only the features that are implemented right now. Planned event, tournament, and scoreboard work is listed separately at the end as future work.

---

## What the app does today

### 1. Authentication and profile management

Users can register, log in, view their profile, and update profile details. The app also supports Firebase token verification for cases where Firebase-based sign-in is used.

Implemented auth features:

- Register a new user account.
- Log in with password-based authentication.
- Verify Firebase sign-in tokens.
- View and edit the logged-in user profile.
- Set or update a password after account creation.
- View available roles and request role changes where allowed.

### 2. Role management

The app supports multiple user roles:

- `student`
- `games-captain`
- `admin`
- `counter-staff`
- `psu`
- `faculty-coordinator`
- `coach`
- `private-coach`
- `academic-staff`

Role-related features:

- Users can request a role change.
- Users can see and cancel their own role requests.
- Admins can review role requests.
- Admins can update user roles directly.

### 3. Equipment management

The equipment module is the core inventory system for the app. It covers sport-wise equipment browsing, student requests, staff issue/return operations, stock updates, and request history.

Student-facing features:

- Dashboard shows equipment grouped by sport.
- Only the equipment name and current available count are shown in the student dashboard view.
- Students can search equipment by name.
- Students can request equipment with a pickup time.
- Students can view request history.
- Students can see their issued items.
- Students can cancel eligible requests.

Staff/admin features:

- Counter staff can view all active requests in one place.
- Staff can issue equipment, decline requests, and process returns.
- The staff workflow supports request states such as `pending`, `issued`, `pending_return`, `returned`, and `cancelled`.
- Stock is updated when equipment is issued, returned, added, or removed.
- Admins and counter staff can manage equipment records.
- Admins can add sports and assign equipment under each sport.

### 4. Court and venue availability

The court availability feature lets students check which courts are open for a selected date and time.

Implemented behaviour:

- Courts are fetched from the database together with their latest availability status.
- Users can filter courts by type, sport, and search text.
- The availability checker evaluates the selected date and time against court status records.
- Indoor courts are treated as available only from 9:00 AM to 8:00 PM.
- Outdoor courts are treated as available 24/7.
- The page hides empty placeholder fields so only meaningful status details are shown.
- Status labels are color-coded for easier reading.

Court types currently shown in the app include examples such as:

- Indoor gymnasium courts
- Badminton courts
- Basketball court
- Volleyball court
- Table tennis area
- Carrom room
- Chess room
- Outdoor cricket ground
- Football field
- Rugby ground
- Hockey field
- Tennis court
- Netball court
- Main gymnasium hall

### 5. Admin court management

Admin and counter staff can manage court status and gym crowd level.

Implemented admin court tools:

- Update court status.
- Block a court for maintenance or other reasons.
- Update the current gym crowd level.
- Review all courts and their latest status information.

### 6. Partner finder

The partner finder is a matching and coordination feature for students and other eligible users who want to find practice partners.

Implemented partner finder behaviour:

- Create a partner request.
- Browse available requests.
- Search requests.
- Join a request.
- Accept or reject join requests.
- Confirm or cancel matches.
- Edit or close a request.
- View notifications related to partner-finder activity.
- Chat inside a partner request thread.
- View your own partner requests.

### 7. Notifications and messaging

The app includes notification and request messaging support for partner finder workflows.

Implemented notification features:

- Store notifications for request actions.
- Mark notifications as read.
- Delete notifications.
- Show request-linked chat conversations.

---

## Technology stack

Frontend:

- React
- Vite
- React Router
- Axios

Backend:

- Node.js
- Express
- PostgreSQL
- JWT authentication
- bcryptjs for password hashing
- Firebase Admin for token verification

Database:

- PostgreSQL initialized through `code/database/init.sql`

---

## Project structure

Main folders in this repository:

- `code/frontend` — React UI
- `code/backend` — Express API and business logic
- `code/database` — schema and seed data
- `docs` — project documentation

Important frontend routes already implemented:

- `/dashboard`
- `/request-equipment`
- `/request-history`
- `/profile`
- `/manage-equipment`
- `/add-equipment`
- `/issue-equipment`
- `/staff-equipment`
- `/my-issued-items`
- `/role-management`
- `/partner-finder`
- `/student-court-availability`
- `/admin-court-management`

---

## Database overview

The current schema includes tables for:

- users
- role requests
- sports
- equipment
- sport-equipment mapping
- equipment requests
- partner requests
- join requests
- notifications
- courts
- court status history
- gym crowd status

The database seed script is designed to be safe to run more than once. It creates the schema if needed and inserts sample data without duplicating existing rows where possible.

Court availability uses the latest court status row, while crowd level uses the latest gym crowd status row.

---

## API summary

### Authentication

- `POST /api/auth/register` — register a user
- `POST /api/auth/login` — log in
- `POST /api/auth/verify-firebase` — verify Firebase tokens
- `GET /api/auth/profile` — get profile data
- `PUT /api/auth/profile` — update profile
- `PUT /api/auth/profile/password` — set or update password

### Roles

- `GET /api/auth/roles` — list available roles
- `GET /api/auth/role-requests/me` — get my role requests
- `POST /api/auth/role-requests` — create a role change request
- `DELETE /api/auth/role-requests/:id` — cancel a request
- `GET /api/auth/role-requests` — admin review list
- `PATCH /api/auth/role-requests/:id/review` — admin review action
- `GET /api/auth/users` — admin user list
- `PATCH /api/auth/users/:userId/role` — admin role update

### Equipment

- `GET /api/equipment` — grouped equipment list by sport
- `GET /api/equipment/history/:studentId` — student request history
- `POST /api/equipment/request` — request equipment
- `DELETE /api/equipment/request/:requestId` — cancel request
- `PATCH /api/equipment/request/:requestId` — mark as pending return
- `PATCH /api/equipment/request/:requestId/return-approved` — approve a return
- `PUT /api/equipment/:equipmentId/quantity` — update stock quantity

### Admin equipment management

- `GET /api/admin/list` — full equipment list with availability
- `GET /api/admin/requests` — all active requests
- `GET /api/admin/requests/:regNumber` — requests for one student
- `GET /api/admin/pending-return/:regNumber` — pending return items
- `GET /api/admin/history/:regNumber` — student history
- `POST /api/admin/accept/:requestId` — issue equipment
- `POST /api/admin/decline/:requestId` — decline request
- `POST /api/admin/return/:requestId` — process return

### Manage equipment

- `GET /api/manage` — equipment list
- `GET /api/manage/sports/list` — list sports
- `POST /api/manage/sports/add` — add a sport
- `POST /api/manage` — add equipment
- `PUT /api/manage/:id` — update equipment
- `DELETE /api/manage/:id` — delete equipment
- `PATCH /api/manage/:id/add-stock` — add stock
- `PATCH /api/manage/:id/remove-stock` — remove stock

### Courts and crowd level

- `GET /api/courts` — fetch courts with latest status
- `PUT /api/courts/:id/status` — update court status
- `PUT /api/courts/:id/block` — block a court
- `GET /api/courts/crowd` — get current crowd level
- `PUT /api/courts/crowd` — update crowd level

### Partner finder

- `GET /api/partner-finder/meta` — metadata for the feature
- `POST /api/partner-finder/requests` — create a request
- `GET /api/partner-finder/requests/available` — browse available requests
- `GET /api/partner-finder/requests/search` — search requests
- `POST /api/partner-finder/requests/:requestId/join` — join a request
- `POST /api/partner-finder/requests/:requestId/join-requests/:joinRequestId/accept` — accept a join request
- `POST /api/partner-finder/requests/:requestId/join-requests/:joinRequestId/reject` — reject a join request
- `POST /api/partner-finder/requests/:requestId/join-requests/:joinRequestId/confirm` — confirm a match
- `POST /api/partner-finder/requests/:requestId/join-requests/:joinRequestId/cancel` — cancel a match
- `PUT /api/partner-finder/requests/:requestId` — update a request
- `POST /api/partner-finder/requests/:requestId/close` — close a request
- `DELETE /api/partner-finder/requests/:requestId` — delete a request
- `GET /api/partner-finder/notifications` — get notifications
- `PATCH /api/partner-finder/notifications/:notificationId/read` — mark read
- `DELETE /api/partner-finder/notifications/:notificationId` — delete notification
- `GET /api/partner-finder/requests/me` — get my requests
- `GET /api/partner-finder/requests/:requestId/chat` — get chat messages
- `POST /api/partner-finder/requests/:requestId/chat` — send chat message

---

## Local setup

### Prerequisites

- Node.js 18 or newer
- PostgreSQL 13 or newer
- Optional Firebase project if Firebase login is used

### Backend environment variables

Create `code/backend/.env` with values similar to these:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gympappa
DB_USER=postgres
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Frontend environment variables

Create `code/frontend/.env` if you need custom values:

```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Install and run

### Backend

```bash
cd code/backend
npm install
npm run dev
```

The backend runs on `http://localhost:5000` by default.

### Frontend

```bash
cd code/frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

### Database initialization

If you need to reload the schema and seed data:

```bash
cd code/database
psql -U postgres -d gympappa < init.sql  : to run in mac
psql -U postgres -d gympappa -f init.sql  : to run in windows

```

The script is intended to be safe to run multiple times.

---

## How to use the app

### Student flow

1. Log in as a student.
2. Open the dashboard to view sports equipment grouped by sport.
3. Search equipment by name if needed.
4. Request equipment with a pickup time.
5. Check request history or issued items.
6. Open the court availability page to check live availability by date, time, sport, and court type.
7. Use the partner finder to create or join partner requests.

### Counter-staff flow

1. Log in as `counter-staff`.
2. Open the staff equipment page to see active requests.
3. Issue, decline, or process returns from one workflow.
4. Update stock when needed.
5. Review court status and crowd level if you have the required role.

### Admin flow

1. Manage equipment and sports.
2. Review role requests.
3. Update court status or block courts when needed.
4. Update crowd level.
5. Review partner finder activity and user access workflows.

---

## Notes about court availability

The current court availability feature applies the following rules:

- Indoor courts are shown as open for booking only from 9:00 AM to 8:00 PM.
- Outdoor courts are treated as available 24/7.
- The time selector is constrained based on the selected court/sport type.
- Only the court availability feature uses these rules; equipment workflows are not affected.

---

## Future work for this semester

The following items are planned for later work and are not part of the current implementation:

- Event management for gymnasium and ground activities.
- Tournament management.
- Scoreboard features for tournaments and match tracking.
- Additional debugging and refinement in the partner finder module.
- Additional debugging and refinement in the court availability module.

These items are intentionally listed here as future tasks so readers know they are not yet implemented.

---

## Troubleshooting

- If the frontend shows old data, make sure the backend is running and the JWT token is still valid.
- If an equipment request fails, verify that the database schema was initialized with the current `init.sql` file.
- If court availability looks wrong, check that court records have the expected location and latest status rows.
- If partner finder data looks stale, confirm the backend API and notifications endpoints are reachable.

---

## Maintaining this README

Update this file when you:

- Add a new feature page or API module.
- Change the database schema.
- Rename routes.
- Add or remove supported roles.
- Change the setup or environment variables.

This README should always describe the current implemented state of the project, not planned work.


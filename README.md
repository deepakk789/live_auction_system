# AuctionX — Live Auction Orchestration Platform

> A full-stack real-time auction platform supporting concurrent multi-auction sessions, dual bidding modes, JWT authentication, and WebSocket-powered live synchronization.

![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express_v5-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_v9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-v4-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | *[Vercel Deployment](https://live-auction-system.vercel.app/)* |
| Backend API | *[Render API](https://live-auction-system-hslw.onrender.com/)* |


---

## Features

### Core Auction Features
- **Dual Bidding Modes** — Offline (organizer-controlled) & Online (distributed team bidding)
- **Real-time WebSocket Sync** — All connected clients see bid updates in under 10ms
- **Auto-Sell on Timer** — When countdown hits 0, highest bidder automatically wins
- **Auto-Advance** — Next player is brought up automatically after each sell/unsold decision
- **Disconnect-Pause** — If a team manager disconnects during ONLINE mode, auction pauses until they reconnect
- **RANDOM / MANUAL player selection** — Organizer controls order or randomizes

### Multi-User System
- **JWT Authentication** — Secure login, register, and token-based session
- **Forgot Password** — Email-based password reset with 1-hour expiry token
- **Co-Organizer Support** — Up to 3 co-organizers per auction with real-time locking
- **Team Manager Dashboard** — Teams bid independently with their own live view
- **Viewer Mode** — Read-only spectator page for audience members

### Analytics & History
- **Post-Auction Snapshots** — Every ended auction archives full team + player data to MongoDB
- **Analytics Dashboard** — Charts for budget used, sold vs unsold, team composition
- **Past Auctions Page** — Browse, search, and filter all completed auctions
- **Upcoming Auctions Page** — Schedule future auctions with date/time

### Organizer Controls
- **Auction Setup** — Configure team count, starting budget, bid increments
- **Excel / CSV Upload** — Import player roster directly via `.xlsx` file
- **Organizer Lock** — Only one organizer can control the podium at a time
- **Force Skip** — Mark a player unsold and advance to the next
- **Reset Auction** — Reset all states while preserving the archived snapshot

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 (Vite) | UI framework |
| React Router DOM v7 | Client-side routing |
| Socket.IO Client v4 | Real-time WebSocket connection |
| Framer Motion | Page transitions & animations |
| Recharts | Analytics charts |
| Lucide React | Icon library |
| XLSX (SheetJS) | Excel file parsing |
| Vanilla CSS (custom design system) | Styling — no CSS frameworks used |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express v5 | REST API server |
| Socket.IO v4 | WebSocket server (room-scoped) |
| MongoDB + Mongoose v9 | Database |
| JWT (jsonwebtoken) | Authentication tokens |
| bcryptjs | Password hashing |
| Nodemailer | Password reset emails |
| Multer | File upload handling |

---

## Project Structure

```
auction_system/
├── backend/
│   ├── controllers/
│   │   └── auctionController.js   # REST API handlers
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT protect middleware
│   ├── models/
│   │   ├── Auction.js             # Auction schema
│   │   ├── Player.js              # Player schema
│   │   ├── Team.js                # Team schema
│   │   └── User.js                # User schema
│   ├── routes/
│   │   ├── auctionRoutes.js       # Auction API routes
│   │   └── auth.js                # Auth routes
│   ├── utils/
│   │   └── emailService.js        # Nodemailer email helper
│   └── server.js                  # Express + Socket.IO server
│
└── frontend/
    └── src/
        ├── components/            # Reusable UI components
        │   ├── Layout.jsx         # Global sidebar + navbar
        │   ├── BorderGlow.jsx     # Animated glow card wrapper
        │   ├── ShuffleLoader.jsx  # Loading animation
        │   └── ...
        ├── context/
        │   └── AuthContext.jsx    # Global auth state
        ├── pages/                 # Route-level page components
        │   ├── Home.jsx
        │   ├── OrganizerLive.jsx  # Offline auction control
        │   ├── OrganizerOnlineView.jsx # Online auction control
        │   ├── TeamRepDashboard.jsx    # Team bidding interface
        │   ├── ViewerLive.jsx     # Spectator view
        │   ├── AuctionAnalytics.jsx
        │   └── ...
        ├── services/              # API call helpers
        └── styles/
            └── design-system.css  # Global CSS design tokens
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- A Gmail account for Nodemailer (or any SMTP provider)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/auction_system.git
cd auction_system
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/auctionx
JWT_SECRET=your_super_secret_key_here
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm start
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset with token |
| POST | `/api/auction/init` | Create new auction |
| GET | `/api/auction/sync/:id` | Fetch full auction state |
| POST | `/api/auction/upload-players` | Upload player roster |
| GET | `/api/auction/list` | List all auctions |
| POST | `/api/auction/end` | End and archive auction |
| GET | `/api/auction/analytics/:id` | Fetch auction analytics |

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `join_auction` | Client → Server | Join a specific auction room |
| `online_bid` | Client → Server | Place a bid (ONLINE mode) |
| `bid_accepted` | Server → Client | Broadcast accepted bid to all |
| `bid_countdown_tick` | Server → Client | Timer countdown tick |
| `player_sold_auto` | Server → Client | Auto-sell when timer hits 0 |
| `auction_state` | Both | State change (LIVE/PAUSED/ENDED) |
| `manager_status_change` | Server → Client | Team manager online/offline |
| `online_next_player` | Server → Client | Next player to be auctioned |

---

## Deployment

| Service | Platform |
|---|---|
| Frontend | [Vercel](https://vercel.com) — auto-deploys from `main` branch |
| Backend | [Render](https://render.com) — Node.js web service |
| Database | [MongoDB Atlas](https://cloud.mongodb.com) |

---

## Author

**Deepak Singh**
- Built as a full-stack engineering project demonstrating real-time systems, multi-user authentication, and persistent state management.

---

## License

MIT License — feel free to fork and use for your own events.

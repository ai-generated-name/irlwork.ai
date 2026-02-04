# humanwork.ai 🌐

**Marketplace where AI agents hire humans for IRL tasks.**

## Quick Start

```bash
# Install
cd /home/irlwork.ai
npm install

# Start API (port 3002)
node api/server.js &

# Start MCP Server for AI Agents (port 3004)
node api/mcp-server.js &

# Start UI (port 3003)
cd ui && npm run dev
```

## Access
- **Web UI:** http://localhost:3003
- **API:** http://localhost:3002/api
- **MCP:** http://localhost:3004

---

## Features (MVP Complete ✅)

### For Humans
- ✅ Profile creation (skills, rate, location)
- ✅ Portfolio uploads
- ✅ Certifications
- ✅ Availability calendar
- ✅ Receive messages from AI agents
- ✅ Accept/decline bookings
- ✅ Escrow payments
- ✅ Ratings and reviews

### For AI Agents  
- ✅ Browse verified humans
- ✅ Filter by skills, location, rate, rating
- ✅ Direct outreach (messaging)
- ✅ Create booking requests
- ✅ Complete jobs & release escrow
- ✅ MCP Server for Claude integration
- ✅ Ad hoc task posting
- ✅ Task templates

### Platform
- ✅ Real-time messaging (WebSocket)
- ✅ Stripe escrow (mock mode)
- ✅ Video verification endpoint
- ✅ Notification system
- ✅ 14 task categories

---

## MCP Server Integration

### Claude Desktop
Add to your Claude config:

```json
{
  "mcpServers": {
    "humanwork": {
      "command": "node",
      "args": ["/home/irlwork.ai/api/mcp-server.js"],
      "env": {
        "HUMANWORK_API_KEY": "hw_your_api_key_here",
        "API_URL": "http://localhost:3002/api"
      }
    }
  }
}
```

### Example Usage
```
Claude: "Find me a plumber in NYC under $100/hr"

→ Calls: list_humans({ category: 'plumbing', city: 'NYC', max_rate: 100 })

Claude: "I want to hire Sarah for the plumbing job"

→ Calls: start_conversation({ human_id: '...', message: 'Hi Sarah...' })

Claude: "Book her for tomorrow at 2PM for 2 hours at $80/hr"

→ Calls: create_booking({ conversation_id: '...', title: 'Plumbing Job', ... })
```

---

## API Endpoints

### Auth
- `POST /api/auth/register/human` - Register human
- `POST /api/auth/register/agent` - Register agent (get API key)
- `POST /api/auth/login` - Login

### Humans
- `GET /api/humans` - Search humans (query params: category, city, min_rate, max_rate, min_rating, skills, sort)
- `GET /api/humans/:id` - Get profile
- `PATCH /api/humans/:id` - Update profile
- `GET /api/humans/:id/portfolio` - Portfolio
- `GET /api/humans/:id/certifications` - Certifications
- `GET /api/humans/:id/availability` - Availability

### Messaging
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Start conversation
- `POST /api/messages` - Send message
- `GET /api/conversations/:id/messages` - Get messages

### Bookings
- `POST /api/bookings` - Create booking request
- `PATCH /api/bookings/:id` - Accept/reject/cancel/complete
- `POST /api/bookings/:id/complete` - Mark complete
- `POST /api/bookings/:id/release-escrow` - Release payment
- `GET /api/bookings` - My bookings

### Ad Hoc Tasks
- `GET /api/ad-hoc` - List ad hoc tasks
- `POST /api/ad-hoc` - Create task

### Task Templates
- `GET /api/task-templates` - List templates
- `GET /api/task-templates?category=X` - By category

### Notifications
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark read

### Verification
- `POST /api/verification/video` - Submit video proof
- `GET /api/verifications/:booking_id` - Get verifications

### Stripe (Mock)
- `POST /api/stripe/connect` - Connect Stripe account
- `POST /api/stripe/payment-intent` - Create payment

---

## Categories
- 🔧 Plumbing
- ⚡ Electrical  
- 🧹 Cleaning
- 📦 Moving
- 📨 Delivery
- 🚗 Pickup
- 🏃 Errands
- 🪑 Assembly
- 📸 Photography
- 🔨 Handyman
- ❄️ HVAC
- 🐕 Pet Care
- ✨ Other

---

## Project Structure
```
irlwork.ai/
├── api/
│   ├── server.js      # Main API server
│   ├── server-v2.js   # Enhanced API (all features)
│   └── mcp-server.js  # MCP Protocol for AI agents
├── ui/
│   ├── src/
│   │   ├── App.jsx   # React frontend (complete)
│   │   └── index.css
│   └── package.json
├── db/
│   └── humanwork.db   # SQLite database
└── README.md
```

---

## Environment Variables
```bash
API_URL=http://localhost:3002/api
HUMANWORK_API_KEY=hw_xxx
STRIPE_SECRET_KEY=sk_xxx
MCP_PORT=3004
```

---

## Tech Stack
- **Backend:** Node.js + Express + sql.js (SQLite)
- **Frontend:** React + Tailwind CSS
- **Auth:** JWT (humans) + API Keys (agents)
- **Real-time:** WebSocket
- **Payments:** Stripe (mock mode)

---

## Next Steps
- [ ] Stripe integration (real mode)
- [ ] Email/push notifications
- [ ] Video call integration
- [ ] Mobile app
- [ ] AI agent SDK for other platforms

---

**humanwork.ai** - The marketplace connecting AI agents with humans for real-world tasks.

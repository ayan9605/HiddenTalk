# 🔐 Secret Code Chat

A modern, real-time, anonymous chat web app where two users join a private room using a shared secret code.  
Built with **Node.js**, **Express**, **Socket.IO**, and **MongoDB Atlas**, with a clean WhatsApp/Telegram‑style UI using pure **HTML, CSS, and vanilla JavaScript**.

---

## ✨ Features

- 🔑 Secret‑code based private rooms (no signup, no accounts)
- ⚡ Real‑time messaging using WebSockets (Socket.IO)
- 💬 Chat bubbles with timestamps and auto‑scroll
- ✍️ Typing indicator (“Someone is typing…”)
- 🌙 Dark / light mode toggle with persisted preference
- 📱 Fully responsive, mobile‑first layout
- ☁️ MongoDB Atlas persistence (rooms and messages)
- 🔁 Automatic socket reconnection
- 🧱 Basic spam protection & rate limiting
- 📋 One‑click copy/share room code
- 🔔 Sound notification on new messages

---

## 🏗 Tech Stack

**Frontend**

- HTML5
- CSS3 (flexbox, responsive, modern chat layout)
- Vanilla JavaScript (no heavy frameworks)
- Socket.IO client

**Backend**

- Node.js
- Express
- Socket.IO (WebSocket transport)
- MongoDB Atlas via Mongoose
- Helmet, CORS, morgan
- express-rate-limit
- dotenv

---

## 🗂 Project Structure

```bash
your-project/
  backend/
    package.json
    server.js
    .env               # local only, not committed
    models/
      Room.js
      Message.js
    routes/
      roomRoutes.js
    socket/
      index.js
  frontend/
    index.html
    style.css
    script.js
```

- `backend/` – REST API, Socket.IO server, MongoDB models.
- `frontend/` – static SPA connecting to the backend via Socket.IO + REST.

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/secret-code-chat.git
cd secret-code-chat
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
PORT=3000
MONGODB_URI="your-mongodb-atlas-connection-string"
NODE_ENV=development
```

> Make sure your MongoDB Atlas cluster is accessible from your IP / hosting environment and the database name is set to something like `anonymous_chat` in `mongoose.connect` (or adjust accordingly).

### 3. Frontend setup

No build step is required.  
Place these three files in `frontend/`:

- `index.html`
- `style.css`
- `script.js`

(They are already wired for Socket.IO and static file serving from the backend.)

---

## ▶️ Running the app locally

From the `backend/` directory:

```bash
# Development (with nodemon)
npm run dev

# Or plain Node
npm start
```

The server will start on:

```text
http://localhost:3000
```

Now:

1. Open `http://localhost:3000` in **two browsers** or one normal + one incognito window.
2. Enter the **same secret code** on both (e.g. `AYAN-123`).
3. Click **“Join Room”** on both.
4. Start chatting – messages should appear instantly in both windows.

---

## 💡 How It Works

### Rooms

- Each room is identified by a **secret code** (normalized to uppercase, limited length, and sanitized).
- When a user joins a code for the first time, the backend:
  - Creates a `Room` document if it doesn’t exist.
- Multiple users entering the same code join the same private Socket.IO room.

```js
// Room schema (simplified)
{
  code: String,      // secret room code
  createdAt: Date
}
```

### Messages

- Messages are stored in the `messages` collection with:
  - `roomCode`
  - `senderId` (anonymous client-side ID stored in `localStorage`)
  - `message`
  - `timestamp`

```js
// Message schema (simplified)
{
  roomCode: String,
  senderId: String,
  message: String,
  timestamp: Date
}
```

- On `sendMessage`, the backend:
  - Saves to MongoDB.
  - Emits `newMessage` to all clients in that room.

### Real‑time updates

- The frontend uses Socket.IO with WebSocket transport for instant delivery.
- Auto‑reconnect is enabled; if the connection drops, it will attempt to reconnect and rejoin the room.

---

## 🌐 API & Sockets

### REST: fetch room messages

```http
GET /api/rooms/:code/messages?limit=100
```

**Response:**

```json
{
  "roomCode": "AYAN-123",
  "messages": [
    {
      "_id": "...",
      "roomCode": "AYAN-123",
      "senderId": "user-xyz",
      "message": "Hello 👋",
      "timestamp": "2026-04-26T18:00:00.000Z"
    }
  ]
}
```

### Socket events (client ↔ server)

**Client → Server**

- `joinRoom` – join a specific room
  ```js
  socket.emit('joinRoom', { roomCode, senderId });
  ```

- `sendMessage` – send a chat message
  ```js
  socket.emit('sendMessage', { roomCode, senderId, message });
  ```

- `typing` – typing indicator (debounced)
  ```js
  socket.emit('typing', { roomCode, senderId, isTyping: true });
  ```

**Server → Client**

- `newMessage` – broadcast new message to room
- `systemMessage` – join/leave notifications
- `typing` – show/hide “Someone is typing…” for other users

---

## 🎨 UI / UX

- Inspired by WhatsApp/Telegram:
  - Rounded chat bubbles with different colors for “me” vs “them”.
  - Timestamp aligned to the bottom right inside each bubble.
  - Subtle animations and shadow for modern feel.
- Dark / light mode:
  - Controlled via CSS custom properties (`:root` vs `body.light`).
  - Preference persisted in `localStorage`.
- Mobile friendly:
  - Flex layout and media queries for small screens.
  - Full-screen chat view on mobile.

---

## 🔐 Security & Reliability

- **Input sanitization**:
  - Room codes are trimmed, uppercased, and filtered to `A–Z`, digits, `_` and `-`.
  - Messages are trimmed and length-limited to avoid abuse.
- **Rate limiting**:
  - `express-rate-limit` applied to REST routes to mitigate spam/DoS.
- **Environment variables**:
  - Sensitive values (`MONGODB_URI`, etc.) are stored in `.env` (git‑ignored).
- **MongoDB Atlas**:
  - Use SRV connection strings and proper IP/Network Access settings.
- **Error handling & logging**:
  - Simple `try/catch` blocks around DB operations.
  - `morgan` for HTTP logs, `console.error` for runtime issues.

> For production, you should tighten CORS origins, add HTTPS, and consider a central logging / monitoring solution.

---

## 📈 Performance Considerations

- Efficient DOM updates:
  - Messages are appended as DOM nodes instead of re-rendering the whole list.
- Auto-scroll:
  - Uses `requestAnimationFrame` for smooth scroll to the latest message.
- Typing indicator:
  - Debounced on the client; sends fewer `typing` events to the server.
- Socket.IO:
  - WebSocket transport is preferred; reconnection is tuned for a “instant” feel.

---

## 🧩 Possible Extensions

These are not required, but nice to add:

- 🔐 End‑to‑end encryption per room (e.g. using a shared secret derived from the code).
- ⏱ Self‑destruct messages (per‑message TTL or room‑level retention).
- 🔕 Mute / unmute sound notifications.
- 🃏 Custom avatars or random emoji identity per session.
- 🌍 Multi‑language UI.

---

## 🤝 Contributing

Contributions, ideas, and suggestions are welcome!

1. Fork the repo.
2. Create a feature branch:  
   `git checkout -b feature/my-cool-idea`
3. Commit your changes:  
   `git commit -m "Add my cool idea"`
4. Push to the branch:  
   `git push origin feature/my-cool-idea`
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** – feel free to use it as a base for your own chat experiments.

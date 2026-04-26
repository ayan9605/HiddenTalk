// Basic state
let socket = null;
let currentRoomCode = null;
let senderId = null;
let typingTimeoutId = null;

// Elements
const landingScreen = document.getElementById('landing-screen');
const chatScreen = document.getElementById('chat-screen');
const roomCodeInput = document.getElementById('room-code-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const generateCodeBtn = document.getElementById('generate-code-btn');
const copyRoomCodeBtn = document.getElementById('copy-room-code-btn');
const currentRoomCodeLabel = document.getElementById('current-room-code');
const connectionStatus = document.getElementById('connection-status');
const messagesContainer = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const toggleThemeLanding = document.getElementById('toggle-theme-landing');
const toggleThemeChat = document.getElementById('toggle-theme-chat');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const messageSound = document.getElementById('message-sound');

// Utilities
function generateSenderId() {
  return (
    'user-' +
    Math.random().toString(36).substring(2, 8) +
    '-' +
    Date.now().toString(36)
  );
}

function sanitizeRoomCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

function formatTime(dateStrOrDate) {
  const d =
    dateStrOrDate instanceof Date ? dateStrOrDate : new Date(dateStrOrDate);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// Theme
function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
  } else {
    document.body.classList.remove('light');
  }
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light');
  setTheme(isLight ? 'dark' : 'light');
}

// Sound
function playMessageSound() {
  try {
    messageSound.currentTime = 0;
    messageSound.play().catch(() => {});
  } catch (e) {}
}

// DOM rendering
function appendSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'system-message';
  div.textContent = text;
  messagesContainer.appendChild(div);
  scrollToBottom();
}

function appendChatMessage({ senderId: sId, message, timestamp }) {
  const isMe = sId === senderId;

  const row = document.createElement('div');
  row.className = 'message-row ' + (isMe ? 'me' : 'them');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = formatTime(timestamp);

  bubble.appendChild(textSpan);
  bubble.appendChild(meta);
  row.appendChild(bubble);

  messagesContainer.appendChild(row);
  scrollToBottom();

  if (!isMe && socket && socket.connected) {
    playMessageSound();
  }
}

// Socket.IO setup
function initSocket() {
  socket = io({
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000
  }); // Socket.IO automatically handles reconnection; options tune the delay and attempts.[web:7]

  socket.on('connect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.style.color = '#00bfa5';

    if (currentRoomCode && senderId) {
      socket.emit('joinRoom', {
        roomCode: currentRoomCode,
        senderId
      });
    }
  });

  socket.on('disconnect', () => {
    connectionStatus.textContent = 'Disconnected. Reconnecting...';
    connectionStatus.style.color = '#ff4b5c';
  });

  socket.on('reconnect_attempt', () => {
    connectionStatus.textContent = 'Reconnecting...';
    connectionStatus.style.color = '#ffb02e';
  });

  socket.on('reconnect', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.style.color = '#00bfa5';
  });

  socket.on('newMessage', (msg) => {
    appendChatMessage(msg);
  });

  socket.on('systemMessage', (data) => {
    if (data.type === 'join') {
      appendSystemMessage('A user joined the room.');
    } else if (data.type === 'leave') {
      appendSystemMessage('A user left the room.');
    }
  });

  socket.on('typing', ({ senderId: sId, isTyping }) => {
    if (sId === senderId) return;
    if (isTyping) {
      typingIndicator.classList.remove('hidden');
    } else {
      typingIndicator.classList.add('hidden');
    }
  });
}

function joinRoom() {
  const rawCode = roomCodeInput.value;
  const code = sanitizeRoomCode(rawCode);

  if (!code) {
    roomCodeInput.focus();
    return;
  }

  currentRoomCode = code;
  currentRoomCodeLabel.textContent = code;

  landingScreen.classList.remove('active');
  chatScreen.classList.add('active');

  messagesContainer.innerHTML = '';
  typingIndicator.classList.add('hidden');

  // Load history
  fetch(`/api/rooms/${encodeURIComponent(code)}/messages?limit=100`)
    .then((res) => res.json())
    .then((data) => {
      (data.messages || []).forEach((m) => appendChatMessage(m));
    })
    .catch((err) => {
      console.error('Error loading messages', err);
    });

  if (!socket) {
    initSocket();
  }

  if (socket.connected) {
    socket.emit('joinRoom', { roomCode: code, senderId });
  } // else join will be re-sent on 'connect'
}

function leaveRoom() {
  currentRoomCode = null;
  messagesContainer.innerHTML = '';
  typingIndicator.classList.add('hidden');

  chatScreen.classList.remove('active');
  landingScreen.classList.add('active');

  connectionStatus.textContent = 'Connecting...';
  connectionStatus.style.color = '#8696a0';
}

// Typing events (debounced)
function notifyTyping() {
  if (!socket || !socket.connected || !currentRoomCode) return;

  socket.emit('typing', {
    roomCode: currentRoomCode,
    senderId,
    isTyping: true
  });

  if (typingTimeoutId) clearTimeout(typingTimeoutId);
  typingTimeoutId = setTimeout(() => {
    socket.emit('typing', {
      roomCode: currentRoomCode,
      senderId,
      isTyping: false
    });
    typingTimeoutId = null;
  }, 600);
}

// Event bindings
joinRoomBtn.addEventListener('click', () => {
  joinRoom();
});

generateCodeBtn.addEventListener('click', () => {
  const code =
    'ROOM-' +
    Math.random().toString(36).substring(2, 6).toUpperCase() +
    '-' +
    Math.random().toString(36).substring(2, 4).toUpperCase();
  roomCodeInput.value = code;
});

copyRoomCodeBtn.addEventListener('click', async () => {
  const code = sanitizeRoomCode(roomCodeInput.value);
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    copyRoomCodeBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyRoomCodeBtn.textContent = 'Copy Code';
    }, 1200);
  } catch (e) {
    console.error('Clipboard error', e);
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!socket || !socket.connected || !currentRoomCode) return;

  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('sendMessage', {
    roomCode: currentRoomCode,
    senderId,
    message: text
  });

  messageInput.value = '';
  notifyTyping(); // will quickly send isTyping: false
});

messageInput.addEventListener('input', () => {
  notifyTyping();
});

toggleThemeLanding.addEventListener('click', toggleTheme);
toggleThemeChat.addEventListener('click', toggleTheme);

leaveRoomBtn.addEventListener('click', () => {
  leaveRoom();
});

// Initial bootstrap
(function bootstrap() {
  // Sender ID
  const cachedId = localStorage.getItem('senderId');
  if (cachedId) {
    senderId = cachedId;
  } else {
    senderId = generateSenderId();
    localStorage.setItem('senderId', senderId);
  }

  // Theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  // Focus input
  roomCodeInput.focus();
})();

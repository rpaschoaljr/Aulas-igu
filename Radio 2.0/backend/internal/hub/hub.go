package hub

import (
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"radio20/backend/internal/hub/session"
)

type SessionManager = session.Manager

func NewSessionManager() *SessionManager {
	return session.NewManager()
}

type Message struct {
	Type      string      `json:"type"`
	RoomID    string      `json:"room_id,omitempty"`
	Payload   interface{} `json:"payload"`
	Timestamp int64       `json:"timestamp"`
}

type ClientInterface interface {
	GetRoomID() string
	Send(msg Message)
	Close()
}

// MockClient para testes unitários
type MockClient struct {
	RoomID   string
	Received []Message
	mu       sync.Mutex
}

func NewMockClient(roomID string) *MockClient {
	return &MockClient{
		RoomID:   roomID,
		Received: make([]Message, 0),
	}
}

func (m *MockClient) GetRoomID() string {
	return m.RoomID
}

func (m *MockClient) Send(msg Message) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Received = append(m.Received, msg)
}

func (m *MockClient) GetReceived() []Message {
	m.mu.Lock()
	defer m.mu.Unlock()
	copied := make([]Message, len(m.Received))
	copy(copied, m.Received)
	return copied
}

func (m *MockClient) Close() {}

// WebSocketClient para conexões de produção
type WebSocketClient struct {
	Hub    *Hub
	Conn   *websocket.Conn
	SendCh chan Message
	RoomID string
	UserID string
}

func (c *WebSocketClient) GetRoomID() string {
	return c.RoomID
}

func (c *WebSocketClient) Send(msg Message) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RECOVER] client send panic: %v", r)
		}
	}()

	select {
	case c.SendCh <- msg:
	default:
		// Se o canal estiver cheio, descarta defensivamente
	}
}

func (c *WebSocketClient) Close() {
	if c.Conn != nil {
		c.Conn.Close()
	}
}

func (c *WebSocketClient) ReadPump() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RECOVER] ReadPump panic: %v", r)
		}
		c.Hub.Unregister(c)
		c.Close()
	}()

	c.Conn.SetReadLimit(512 * 1024)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			break
		}
		msg.RoomID = c.RoomID
		msg.Timestamp = time.Now().UnixMilli()
		c.Hub.HandleIncomingMessage(c, msg)
	}
}

func (c *WebSocketClient) WritePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RECOVER] WritePump panic: %v", r)
		}
		ticker.Stop()
		c.Close()
	}()

	for {
		select {
		case message, ok := <-c.SendCh:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteJSON(message); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type Hub struct {
	roomsMu              sync.RWMutex
	rooms                map[string]map[ClientInterface]bool
	register             chan ClientInterface
	unregister           chan ClientInterface
	broadcast            chan Message
	sessionManager       *session.Manager
	OnChatMessage        func(roomID, userID string, payload interface{})
	OnTrackPlaybackError func(roomID, youtubeID string, errorCode int)
	OnTrackDurationSync  func(roomID, youtubeID string, durationSeconds int)
	OnTrackEnded         func(roomID, youtubeID string)
}

func NewHub(sm ...*session.Manager) *Hub {
	var sessionMgr *session.Manager
	if len(sm) > 0 && sm[0] != nil {
		sessionMgr = sm[0]
	} else {
		sessionMgr = session.NewManager()
	}

	return &Hub{
		rooms:          make(map[string]map[ClientInterface]bool),
		register:       make(chan ClientInterface, 256),
		unregister:     make(chan ClientInterface, 256),
		broadcast:      make(chan Message, 512),
		sessionManager: sessionMgr,
	}
}

func (h *Hub) GetSessionManager() *session.Manager {
	return h.sessionManager
}

func (h *Hub) Run() {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RECOVER] Hub Run panic: %v", r)
			go h.Run()
		}
	}()

	for {
		select {
		case client := <-h.register:
			h.roomsMu.Lock()
			roomID := client.GetRoomID()
			if _, ok := h.rooms[roomID]; !ok {
				h.rooms[roomID] = make(map[ClientInterface]bool)
			}
			h.rooms[roomID][client] = true
			listenersCount := len(h.rooms[roomID])
			h.roomsMu.Unlock()

			h.BroadcastToRoom(roomID, Message{
				Type:      "listeners_count",
				RoomID:    roomID,
				Payload:   map[string]int{"count": listenersCount},
				Timestamp: time.Now().UnixMilli(),
			})

		case client := <-h.unregister:
			h.roomsMu.Lock()
			roomID := client.GetRoomID()
			if clients, ok := h.rooms[roomID]; ok {
				if _, present := clients[client]; present {
					delete(clients, client)
					client.Close()
				}
				if len(clients) == 0 {
					delete(h.rooms, roomID)
				}
			}
			listenersCount := len(h.rooms[roomID])
			h.roomsMu.Unlock()

			if h.sessionManager != nil {
				h.sessionManager.UnregisterConnection(client)
			}

			h.BroadcastToRoom(roomID, Message{
				Type:      "listeners_count",
				RoomID:    roomID,
				Payload:   map[string]int{"count": listenersCount},
				Timestamp: time.Now().UnixMilli(),
			})

		case msg := <-h.broadcast:
			h.roomsMu.RLock()
			clients := h.rooms[msg.RoomID]
			for client := range clients {
				client.Send(msg)
			}
			h.roomsMu.RUnlock()
		}
	}
}

func (h *Hub) Register(c ClientInterface) {
	h.register <- c
}

func (h *Hub) Unregister(c ClientInterface) {
	h.unregister <- c
}

func (h *Hub) BroadcastToRoom(roomID string, msg Message) {
	msg.RoomID = roomID
	if msg.Timestamp == 0 {
		msg.Timestamp = time.Now().UnixMilli()
	}
	h.broadcast <- msg
}

func (h *Hub) GetListenersCount(roomID string) int {
	h.roomsMu.RLock()
	defer h.roomsMu.RUnlock()
	return len(h.rooms[roomID])
}

func (h *Hub) HandleIncomingMessage(client *WebSocketClient, msg Message) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[RECOVER] HandleIncomingMessage panic: %v", r)
		}
	}()

	switch msg.Type {
	case "chat_message":
		if h.OnChatMessage != nil {
			h.OnChatMessage(client.RoomID, client.UserID, msg.Payload)
		}
		h.BroadcastToRoom(client.RoomID, msg)
	case "skip_vote":
		h.BroadcastToRoom(client.RoomID, msg)
	case "playback_heartbeat":
		log.Printf("[TELEMETRY] Sala %s (User %s): %+v", client.RoomID, client.UserID, msg.Payload)
	case "track_playback_error":
		if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
			ytID, _ := payloadMap["youtube_id"].(string)
			var errCode int
			if ecFloat, ok := payloadMap["error_code"].(float64); ok {
				errCode = int(ecFloat)
			}
			log.Printf("[RADIO] Reporte de erro de faixa na sala %s: %s (erro: %d)", client.RoomID, ytID, errCode)
			if h.OnTrackPlaybackError != nil && ytID != "" {
				h.OnTrackPlaybackError(client.RoomID, ytID, errCode)
			}
		}
	case "track_duration_sync":
		if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
			ytID, _ := payloadMap["youtube_id"].(string)
			if ytID == "" {
				ytID, _ = payloadMap["youtubeId"].(string)
			}
			var dur int
			if dFloat, ok := payloadMap["duration_seconds"].(float64); ok {
				dur = int(dFloat)
			} else if dInt, ok := payloadMap["duration_seconds"].(int); ok {
				dur = dInt
			} else if dFloat, ok := payloadMap["durationSeconds"].(float64); ok {
				dur = int(dFloat)
			}
			if dur > 0 && ytID != "" && h.OnTrackDurationSync != nil {
				h.OnTrackDurationSync(client.RoomID, ytID, dur)
			}
		}
	case "track_ended":
		if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
			ytID, _ := payloadMap["youtube_id"].(string)
			if ytID == "" {
				ytID, _ = payloadMap["youtubeId"].(string)
			}
			if ytID != "" && h.OnTrackEnded != nil {
				h.OnTrackEnded(client.RoomID, ytID)
			}
		}
	}
}

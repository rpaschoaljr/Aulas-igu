package hub_test

import (
	"testing"
	"time"

	"radio20/backend/internal/hub"
)

func TestHubListenersAndBroadcast(t *testing.T) {
	h := hub.NewHub()
	go h.Run()

	roomID := "room-rock"

	client1 := hub.NewMockClient(roomID)
	client2 := hub.NewMockClient(roomID)

	h.Register(client1)
	h.Register(client2)

	// Pequena pausa para processamento do canal
	time.Sleep(20 * time.Millisecond)

	count := h.GetListenersCount(roomID)
	if count != 2 {
		t.Errorf("expected 2 listeners in room %s, got %d", roomID, count)
	}

	// Broadcast para a sala
	msg := hub.Message{
		Type:    "chat_message",
		RoomID:  roomID,
		Payload: map[string]string{"text": "Fala galera do Rock!"},
	}
	h.BroadcastToRoom(roomID, msg)

	time.Sleep(20 * time.Millisecond)

	// Verifica que receberam a mensagem de chat
	var client1ReceivedChat, client2ReceivedChat bool
	for _, m := range client1.GetReceived() {
		if m.Type == "chat_message" {
			client1ReceivedChat = true
		}
	}
	for _, m := range client2.GetReceived() {
		if m.Type == "chat_message" {
			client2ReceivedChat = true
		}
	}

	if !client1ReceivedChat {
		t.Errorf("expected client1 to receive chat_message")
	}
	if !client2ReceivedChat {
		t.Errorf("expected client2 to receive chat_message")
	}

	h.Unregister(client1)
	time.Sleep(20 * time.Millisecond)

	count = h.GetListenersCount(roomID)
	if count != 1 {
		t.Errorf("expected 1 listener after unregister, got %d", count)
	}
}

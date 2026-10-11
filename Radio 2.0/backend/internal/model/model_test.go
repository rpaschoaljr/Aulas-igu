package model

import (
	"testing"
	"time"
)

func TestModelStructures(t *testing.T) {
	u := User{ID: "u1", Nickname: "DJ", AvatarURL: "/dj.png"}
	if u.Nickname != "DJ" {
		t.Errorf("expected DJ, got %s", u.Nickname)
	}

	tr := Track{ID: "t1", YouTubeID: "yt1", Title: "Rock", DurationSeconds: 200}
	if tr.DurationSeconds != 200 {
		t.Errorf("expected 200, got %d", tr.DurationSeconds)
	}

	qi := QueueItem{
		ID:        "q1",
		RoomID:    "radio-six-nine",
		Position:  1,
		Track:     tr,
		CreatedAt: time.Now(),
	}
	if qi.Position != 1 {
		t.Errorf("expected position 1, got %d", qi.Position)
	}

	bt := BlockedTrack{YouTubeID: "block1", ErrorCode: 150, Reason: "embedding disabled"}
	if bt.ErrorCode != 150 {
		t.Errorf("expected 150, got %d", bt.ErrorCode)
	}
}

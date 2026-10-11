package session

import (
	"testing"
)

func TestSessionManager_AcquireAndRelease(t *testing.T) {
	sm := NewManager()

	// 1. Tenta adquirir apelido vazio
	_, _, ok := sm.AcquireNickname("", "user-1")
	if ok {
		t.Fatalf("esperava falso para apelido vazio")
	}

	// 2. Adquire apelido com sucesso
	disp, norm, ok := sm.AcquireNickname("OuvinteRock", "user-1")
	if !ok || norm != "ouvinterock" {
		t.Fatalf("falha ao adquirir: disp=%s, norm=%s, ok=%v", disp, norm, ok)
	}

	// 3. Segundo usuário tenta o mesmo apelido
	_, _, ok = sm.AcquireNickname("OuvinteRock", "user-2")
	if ok {
		t.Fatalf("esperava conflito para apelido ocupado")
	}

	// 4. Mesmo usuário reconectando com mesmo ID
	_, _, ok = sm.AcquireNickname("OuvinteRock", "user-1")
	if !ok {
		t.Fatalf("esperava permissão para reconexão do mesmo usuário")
	}

	// 5. Libera apelido
	sm.ReleaseNickname(norm)
	if sm.IsNicknameActive("OuvinteRock") {
		t.Fatalf("esperava apelido liberado")
	}
}

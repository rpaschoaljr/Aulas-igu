from radio_backend.security.normalize import normalize


def test_normalize_trims_and_lowercases() -> None:
    assert normalize("  tEste  ") == "teste"
    assert normalize("Fulano@Email.com") == "fulano@email.com"
    assert normalize("   ") == ""


def test_normalize_collides_variants() -> None:
    assert normalize("Teste") == normalize("tEste") == normalize("teSte") == "teste"

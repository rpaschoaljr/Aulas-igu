import pytest

from radio_backend.security.password import validate_password


@pytest.mark.parametrize(
    "password",
    ["Senha1@forte", "Abcd1234!", "Aa1!bbbb", "Xy9#zzzzz", "Qwerty1!"],
)
def test_valid_passwords(password: str) -> None:
    assert validate_password(password) is True


@pytest.mark.parametrize(
    "password",
    [
        "Aa1!bbb",
        "aaaaaaaa",
        "AAAAAAAA",
        "Abcdefg1",
        "Abcdefg!",
        "Abcdefgh",
        "12345678",
        "Abcd1234",
        "abcd1234",
        "ABCD1234",
        "Abcd!@#$",
        "",
        "        ",
        "Aa1@a",
        "semspecial",
    ],
)
def test_invalid_passwords(password: str) -> None:
    assert validate_password(password) is False

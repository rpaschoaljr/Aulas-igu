import email_validator
from pydantic import BaseModel, Field, field_validator

from radio_backend.security.password import validate_password


class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=32)
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def email_format(cls, value: str) -> str:
        try:
            email_validator.validate_email(value, check_deliverability=False)
        except email_validator.EmailNotValidError as exc:
            raise ValueError("e-mail inválido") from exc
        return value

    @field_validator("password")
    @classmethod
    def password_policy(cls, value: str) -> str:
        if not validate_password(value):
            raise ValueError(
                "senha deve ter no mínimo 8 caracteres, com 1 maiúscula, "
                "1 minúscula, 1 número e 1 caractere especial"
            )
        return value


class LoginRequest(BaseModel):
    login: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    nickname: str
    email: str
    verified: bool

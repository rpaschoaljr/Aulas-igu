"""Gerenciador de conexões WebSocket ativas e broadcast em tempo real."""

from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    """Mantém as conexões abertas e faz broadcast dos eventos do backend."""

    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    def add(self, websocket: WebSocket) -> None:
        self._connections.add(websocket)

    def remove(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    def clear(self) -> None:
        self._connections.clear()

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Envia `message` a todos; remove as conexões que falharam."""
        dead: list[WebSocket] = []
        for websocket in list(self._connections):
            try:
                await websocket.send_json(message)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.remove(websocket)


manager = ConnectionManager()

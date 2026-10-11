# Stage 1: Compilação
FROM golang:alpine AS builder

WORKDIR /app

ENV GOTOOLCHAIN=auto
RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o radio-server ./cmd/server

# Stage 2: Runtime enxuto
FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/radio-server .

EXPOSE 8080

CMD ["./radio-server"]

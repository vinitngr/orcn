FROM golang:1.25-bookworm

WORKDIR /app

ENV CGO_ENABLED=1

COPY go.mod go.sum ./
RUN go mod download

CMD ["go", "run", "./services/gateway/..."]

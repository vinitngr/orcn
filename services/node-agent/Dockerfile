FROM golang:1.25.1-bookworm AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" \
    -o /out/node-agent ./services/node-agent

FROM alpine:latest

RUN apk add --no-cache ca-certificates

COPY --from=build /out/node-agent /usr/local/bin/node-agent

EXPOSE 8080 9090

ENTRYPOINT ["/usr/local/bin/node-agent"]

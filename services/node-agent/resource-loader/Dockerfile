FROM golang:1.25.1-bookworm AS build

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -trimpath -ldflags="-s -w" \
    -o /out/resource-loader ./services/node-agent/resource-loader

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=build /out/resource-loader /usr/local/bin/resource-loader
ENTRYPOINT ["/usr/local/bin/resource-loader"]

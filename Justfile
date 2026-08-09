# Existing service commands

build-gateway:
	@mkdir -p bin
	go build -o bin/gateway ./services/gateway/...

run-gateway:
	go run ./services/gateway/...

node-agent-build:
	docker build -f services/node-agent/Dockerfile -t vinitngr/orcn-agent:dev .

node-agent-loader-build:
	docker build -f services/node-agent/resource-loader/Dockerfile -t vinitngr/orcn-resource-loader:dev .

node-agent-build-all: node-agent-build node-agent-loader-build

node-agent-run:
	docker rm -f orcn-node-agent 2>/dev/null || true
	docker run -d --name orcn-node-agent \
	  -p 127.0.0.1:9090:9090 \
	  -p 127.0.0.1:8080:8080 \
	  -v /var/run/docker.sock:/var/run/docker.sock \
	  -e NODE_AGENT_ADMIN_ADDRESS=0.0.0.0:9090 \
	  -e NODE_AGENT_PROXY_ADDRESS=0.0.0.0:8080 \
	  -e NODE_AGENT_REGISTRATION_API_KEY=dev-registration-key \
	  -e NODE_AGENT_RESOURCE_LOADER_IMAGE=vinitngr/orcn-resource-loader:dev \
	  vinitngr/orcn-agent:dev

node-agent-logs:
	docker logs --tail 100 -f orcn-node-agent

node-agent-events:
	curl -s http://127.0.0.1:9090/events

node-agent-events-live:
	curl -sN -H 'X-Registration-Key: dev-registration-key' http://127.0.0.1:9090/events?live=true

node-agent-test-loader:
	printf '%s' '{"version":1,"resources":[{"id":"post-one","type":"http","config":{"url":"https://jsonplaceholder.typicode.com/posts/1"},"destination":"/data/post.json"}]}' > /tmp/orcn-resource-plan.json
	docker volume rm orcn-loader-test-volume 2>/dev/null || true
	docker run --rm --name orcn-resource-loader-test \
	  --mount type=volume,source=orcn-loader-test-volume,target=/data \
	  --mount type=bind,source=/tmp/orcn-resource-plan.json,target=/run/resource-plan.json,readonly \
	  vinitngr/orcn-resource-loader:dev
	docker run --rm --mount type=volume,source=orcn-loader-test-volume,target=/data alpine:latest cat /data/post.json
	docker volume rm orcn-loader-test-volume
	rm -f /tmp/orcn-resource-plan.json

node-agent-test:
	GOCACHE=/tmp/orcn-go-cache go test ./...

clean:
	rm -rf bin/

# Justfile
# This is a command runner similar to Makefile, but specifically designed for executing bash scripts.
# You can run these by installing 'just' and typing: just run-gateway

build-gateway:
	@echo "Building Gateway Service..."
	mkdir -p bin
	go build -o bin/gateway ./services/gateway/...
	@echo "Build complete! Binary located at: bin/gateway"

run-gateway:
	@echo "Starting Gateway Service..."
	go run ./services/gateway/...

clean:
	@echo "Cleaning up bin directory..."
	rm -rf bin/
	@echo "Clean complete."

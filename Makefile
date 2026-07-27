.PHONY: all build-gateway run-gateway clean

# Default target
all: build-gateway

# ==========================================
# Gateway Service
# ==========================================

build-gateway:
	@echo "Building Gateway Service..."
	@mkdir -p bin
	@go build -o bin/gateway ./services/gateway/...
	@echo "Build complete! Binary located at: bin/gateway"

run-gateway:
	@echo "Starting Gateway Service..."
	@go run ./services/gateway/...

# ==========================================
# Utilities
# ==========================================

clean:
	@echo "Cleaning up bin directory..."
	@rm -rf bin/
	@echo "Clean complete."

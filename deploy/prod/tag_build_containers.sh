#!/bin/bash

set -eu

TAG=${TAG:-latest}

echo "=========================================="
echo "Building Docker images for PRODUCTION"
echo "TAG=$TAG"
echo "=========================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

build_image() {
    service_dir="$1"
    image_name="$2"

    echo "=========================================="
    echo "Building: $service_dir"
    echo "Image: $image_name"
    echo "=========================================="

    if [ ! -d "$service_dir" ]; then
        echo "ERROR: Directory $service_dir not found!"
        exit 1
    fi

    docker build -t "$image_name" "$service_dir"
}

echo "=========================================="
echo "Building: react-ystemandchess"
echo "Image: ystemandchess:${TAG}"
echo "=========================================="

docker build \
  --build-arg REACT_APP_MIDDLEWARE_URL="${REACT_APP_MIDDLEWARE_URL}" \
  --build-arg REACT_APP_STOCKFISH_SERVER_URL="${REACT_APP_STOCKFISH_SERVER_URL}" \
  --build-arg REACT_APP_CHESS_SERVER_URL="${REACT_APP_CHESS_SERVER_URL}" \
  --build-arg REACT_APP_CHESS_CLIENT_URL="${REACT_APP_CHESS_CLIENT_URL}" \
  --build-arg REACT_APP_AGORA_APP_ID="${REACT_APP_AGORA_APP_ID}" \
  -t "ystemandchess:${TAG}" \
  react-ystemandchess
build_image "chessServer" "chessserver:${TAG}"
build_image "middlewareNode" "middlewarenode:${TAG}"
build_image "stockfishServer" "stockfishserver:${TAG}"

echo "=========================================="
echo "All production images built!"
echo "=========================================="

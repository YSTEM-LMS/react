#!/usr/bin/env bash
set -u

SERVICE="${1:-}"

case "$SERVICE" in
  frontend)
    URL="http://localhost:3000/"
    EXPECT_200=true
    ;;
  chess-client)
    URL="http://localhost:3002/chessclient/"
    EXPECT_200=true
    ;;
  chess-server)
    URL="http://localhost:3001/"
    EXPECT_200=false
    ;;
  middleware)
    URL="http://localhost:8000/"
    EXPECT_200=true
    ;;
  stockfish-server)
    URL="http://localhost:8080/"
    EXPECT_200=false
    ;;
  *)
    echo "Usage: $0 {frontend|chess-client|chess-server|middleware|stockfish-server}"
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_DIR" || exit 1

CONTAINER="$SERVICE"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"
BACKUP_TAG="ystem-backup-${SERVICE}:${TIMESTAMP}"

OLD_IMAGE_ID=""
TARGET_IMAGE=""

health_check() {
  local attempt
  local code

  for attempt in $(seq 1 15); do
    if [ "$EXPECT_200" = true ]; then
      code="$(curl -sS -o /dev/null -w '%{http_code}' \
        --connect-timeout 2 --max-time 5 "$URL" 2>/dev/null || true)"

      if [ "$code" = "200" ]; then
        return 0
      fi
    else
      if curl -sS -o /dev/null \
        --connect-timeout 2 --max-time 5 "$URL" 2>/dev/null; then
        return 0
      fi
    fi

    echo "Waiting for $SERVICE... attempt $attempt/15"
    sleep 2
  done

  return 1
}

rollback() {
  if [ -z "$OLD_IMAGE_ID" ] || [ -z "$TARGET_IMAGE" ]; then
    echo "No previous image available for rollback."
    return 1
  fi

  echo "== Rolling back $SERVICE =="

  docker tag "$OLD_IMAGE_ID" "$TARGET_IMAGE"

  docker compose up \
    -d \
    --no-deps \
    --no-build \
    --force-recreate \
    "$SERVICE"

  if health_check; then
    echo "Rollback succeeded."
    return 0
  fi

  echo "ERROR: rollback health check failed."
  return 1
}

echo "== Deploying $SERVICE =="

if docker inspect "$CONTAINER" >/dev/null 2>&1; then
  OLD_IMAGE_ID="$(docker inspect -f '{{.Image}}' "$CONTAINER")"
  TARGET_IMAGE="$(docker inspect -f '{{.Config.Image}}' "$CONTAINER")"

  echo "Backing up current image as $BACKUP_TAG"
  docker tag "$OLD_IMAGE_ID" "$BACKUP_TAG"
else
  echo "No existing container found. This deployment will not have rollback available."
fi

echo "== Building new image =="
if ! docker compose build "$SERVICE"; then
  echo "ERROR: build failed. Existing container was not replaced."
  exit 1
fi

echo "== Recreating container =="
if ! docker compose up -d --no-deps --force-recreate "$SERVICE"; then
  echo "ERROR: container recreation failed."
  rollback
  exit 1
fi

echo "== Health check: $URL =="
if health_check; then
  echo "Deploy succeeded: $SERVICE"
else
  echo "ERROR: health check failed."
  rollback
  exit 1
fi

echo "== Rotating backups, keeping latest 5 =="

docker images \
  --format '{{.Repository}}:{{.Tag}}' \
  "ystem-backup-${SERVICE}" \
  | sort -r \
  | tail -n +6 \
  | xargs docker image rm >/dev/null 2>&1 || true

echo "Done."

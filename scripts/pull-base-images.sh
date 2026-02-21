#!/bin/sh
# Pull base images from a Dockerfile only if not already cached locally.
# Usage: pull-base-images.sh <default-platform> <dockerfile>
# This avoids podman's forced "pull=newer" behavior for cross-platform builds,
# which causes Docker Hub rate-limit backoffs (2s+4s+8s+16s = ~30s wasted).

set -e

DEFAULT_PLATFORM="$1"
DOCKERFILE="$2"

if [ -z "$DEFAULT_PLATFORM" ] || [ -z "$DOCKERFILE" ]; then
    echo "Usage: $0 <default-platform> <dockerfile>" >&2
    exit 1
fi

DOCKER=$(command -v podman 2>/dev/null || command -v docker 2>/dev/null)
if [ -z "$DOCKER" ]; then
    echo "Error: Neither podman nor docker found in PATH" >&2
    exit 1
fi

# Collect stage names defined in this Dockerfile (used as base images in multi-stage builds)
STAGE_NAMES=$(grep -i '^FROM' "$DOCKERFILE" | grep -i ' AS ' | awk '{print $NF}' | tr '[:upper:]' '[:lower:]')

# Process each FROM line
grep -i '^FROM' "$DOCKERFILE" | while IFS= read -r line; do
    # Extract platform if specified (--platform=xxx), else use default
    PLATFORM=$(echo "$line" | grep -o -- '--platform=[^ ]*' | cut -d= -f2)
    if [ -z "$PLATFORM" ]; then
        PLATFORM="$DEFAULT_PLATFORM"
    fi

    # Extract image name (strip --platform=xxx, then take 2nd word)
    IMAGE=$(echo "$line" | sed 's/--platform=[^ ]* //g' | awk '{print $2}')

    # Skip scratch
    if [ "$IMAGE" = "scratch" ]; then
        continue
    fi

    # Skip internal stage references (multi-stage COPY --from=<stage>)
    IMAGE_LOWER=$(echo "$IMAGE" | tr '[:upper:]' '[:lower:]')
    if echo "$STAGE_NAMES" | grep -qx "$IMAGE_LOWER"; then
        continue
    fi

    if ! $DOCKER image exists "$IMAGE" 2>/dev/null; then
        echo "Pulling $IMAGE for platform $PLATFORM..."
        $DOCKER pull --platform "$PLATFORM" "$IMAGE"
    fi
done

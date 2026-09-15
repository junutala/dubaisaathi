# Serving the PWA. Two stages: build with Node, serve the static files with nginx — nothing else
# runs in production, because there is nothing else to run. The app is a static bundle and the
# backend is Supabase edge functions.

FROM node:22-alpine AS build
WORKDIR /repo

# The workspace manifests first, so a dependency change is the only thing that busts this layer.
COPY package.json package-lock.json ./
COPY apps/pwa/package.json apps/pwa/
COPY packages/shared/package.json packages/shared/
RUN npm ci

# Both workspaces' tsconfigs extend this one, and esbuild reads it to find the path alias for
# @saathi/shared. Without it `vite build` transforms zero modules and fails on index.html — which
# is a confusing way to be told a file is missing, so it is copied on its own line.
COPY tsconfig.base.json ./

# The PWA imports content straight from data/ — the phrase pack, the places and the keywords —
# so those are build inputs, not runtime files.
COPY packages/ packages/
COPY data/ data/
COPY apps/pwa/ apps/pwa/
# Which build this is. `.git` is not in the image, so the commit comes from Railway's own build
# argument; a local build has neither and says "dev", which is exactly what it is.
ARG RAILWAY_GIT_COMMIT_SHA=""
RUN VITE_BUILD_SHA="$RAILWAY_GIT_COMMIT_SHA" \
    VITE_BUILD_TIME="$(date -u '+%d %b %H:%M')" \
    npm run build --workspace @saathi/pwa

# The offline Hindi speech model that replaces Vosk: Whisper, quantized to int8, plus the ONNX
# runtime it needs. Both are served from our own origin for the same reasons the Vosk model was —
# the CSP stays 'self', no research host has to be up in a Dubai basement, and the download is
# ours to cache.
#
# **No filename here was guessed.** The container these files are chosen in
# cannot reach Hugging Face, so hardcoding "encoder_model_quantized.onnx" would be a guess costing
# a deploy cycle to test. Instead the build asks the API what is actually in the repo and takes
# the quantized ONNX plus the small JSON the tokenizer and feature extractor need. A name that
# changes upstream fails this stage loudly instead of shipping an app that cannot load its model.
#
# It also writes manifest.json — the list the app downloads and the byte total it shows a
# traveller before asking them to wait. One source of truth, generated from what was really
# fetched, so the app and the image cannot drift.
FROM node:22-alpine AS voice
ARG WHISPER_REPO=Xenova/whisper-tiny
RUN apk add --no-cache curl jq
WORKDIR /voice

# The ONNX runtime. All four builds are served, because which one onnxruntime-web asks for is
# decided in the browser and not here, and a 404 in a taxi is not worth saving image space over.
# Only the one the app pins (`whisperStt.ts` sets `wasmPaths`) goes in the manifest: walking this
# directory put 77 MB into a traveller's download to use 26 MB of it.
COPY --from=build /repo/node_modules/onnxruntime-web/dist/ /tmp/ort/
RUN set -eux; \
    mkdir -p ort; \
    cp /tmp/ort/ort-wasm-simd-threaded*.wasm /tmp/ort/ort-wasm-simd-threaded*.mjs ort/; \
    ls -la ort/

# Only the two graphs transformers.js loads for automatic-speech-recognition: the encoder and
# the MERGED decoder. Taking every *quantized.onnx took the separate decoder and its with-past
# twin as well — the same weights twice more, 60 MB of them, in a download a traveller waits for
# on hotel wifi. The first build printed the listing, so these two names are read off it rather
# than guessed, and the count check below fails the build if either stops matching.
#
# (The comment is here rather than inside the RUN. A `#` line between two continued lines is
# stripped by Docker and not by a shell, which is the same untestable-outside-a-build shape that
# the manifest generator was moved into its own file to avoid.)
RUN set -eux; \
    root="https://huggingface.co/${WHISPER_REPO}/resolve/main"; \
    api="https://huggingface.co/api/models/${WHISPER_REPO}/tree/main"; \
    mkdir -p whisper-tiny/onnx; \
    echo "--- what the repo actually holds ---"; \
    curl -fsSL "$api" | jq -r '.[] | select(.type=="file") | .path'; \
    curl -fsSL "$api/onnx" | jq -r '.[] | select(.type=="file") | .path'; \
    echo "--- taking every root .json, and the two graphs the library actually loads ---"; \
    json=$(curl -fsSL "$api" | jq -r '.[] | select(.type=="file") | .path' | grep -E '\.json$'); \
    onnx=$(curl -fsSL "$api/onnx" | jq -r '.[] | select(.type=="file") | .path' \
           | grep -E '(encoder_model|decoder_model_merged)_quantized\.onnx$'); \
    test -n "$json"; \
    test "$(echo "$onnx" | wc -l)" -eq 2; \
    for f in $json; do curl -fsSL --retry 3 -o "whisper-tiny/$f" "$root/$f"; done; \
    for f in $onnx; do curl -fsSL --retry 3 -o "whisper-tiny/$f" "$root/$f"; done; \
    du -sh whisper-tiny; \
    find whisper-tiny -type f -exec ls -la {} \;

# The manifest, from what is on disk rather than from a list someone maintained by hand.
COPY deploy/voice-manifest.mjs /voice-manifest.mjs
RUN node /voice-manifest.mjs manifest.json \
      whisper-tiny \
      ort/ort-wasm-simd-threaded.jsep.wasm \
      ort/ort-wasm-simd-threaded.jsep.mjs \
    && cat manifest.json

FROM nginx:1.27-alpine
# nginx cannot read an environment variable from a config file, and Railway hands the port in at
# runtime. The official image's entrypoint substitutes templates on the way up; the filter limits
# it to PORT so nginx's own $uri and $host survive intact.
ENV NGINX_ENVSUBST_FILTER=PORT
ENV PORT=8080
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/pwa/dist /usr/share/nginx/html
# Whisper, the ONNX runtime, and the manifest that says what a traveller is being asked to fetch.
# Served, not precached: 68 megabytes has no business in the service worker's install step. It is
# fetched deliberately, once, and cached by the app.
COPY --from=voice /voice/whisper-tiny /usr/share/nginx/html/models/whisper-tiny
COPY --from=voice /voice/ort /usr/share/nginx/html/models/ort
COPY --from=voice /voice/manifest.json /usr/share/nginx/html/models/voice-manifest.json

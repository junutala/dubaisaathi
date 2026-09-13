# Serving the PWA. Two stages: build with Node, serve the static files with nginx — nothing else
# runs in production, because there is nothing else to run. The app is a static bundle and the
# backend is Supabase edge functions.

# The offline Hindi speech model.
#
# This runs on the build machine, which has open internet — the container this repository is
# edited from does not, and that limitation was mistaken for the feature being impossible. The
# model is baked into the image and served from our own origin, so the traveller never depends on
# a research host being up, the page's CSP stays 'self', and the download can be cached like any
# other asset.
#
# vosk-browser wants a .tar.gz; alphacephei publishes a .zip, so it is repacked here.
FROM alpine:3.20 AS model
ARG VOSK_MODEL=vosk-model-small-hi-0.22
RUN apk add --no-cache curl unzip tar

# What the alternatives actually weigh, asked rather than assumed. A HEAD costs nothing and the
# answer decides whether a bigger model is a product option at all: a traveller on hotel wifi
# will not fetch a gigabyte, and a cheap phone will not hold one in memory.
RUN set -eux; \
    for m in vosk-model-small-hi-0.22 vosk-model-hi-0.22 vosk-model-small-en-in-0.4 \
             vosk-model-en-in-0.5; do \
      size=$(curl -fsSLI "https://alphacephei.com/vosk/models/$m.zip" 2>/dev/null \
             | tr -d '\r' | awk 'tolower($1)=="content-length:"{print $2}' | tail -1); \
      if [ -n "$size" ]; then \
        echo "MODEL SIZE  $m  $(( size / 1048576 )) MB"; \
      else \
        echo "MODEL SIZE  $m  not published"; \
      fi; \
    done

RUN set -eux; \
    curl -fsSL --retry 3 -o /tmp/model.zip \
      "https://alphacephei.com/vosk/models/${VOSK_MODEL}.zip"; \
    unzip -q /tmp/model.zip -d /tmp/unpacked; \
    echo "--- what the archive contains ---"; \
    find /tmp/unpacked -maxdepth 2 | head -40; \
    du -sh "/tmp/unpacked/${VOSK_MODEL}"; \
    tar -C /tmp/unpacked -czf /model.tar.gz "${VOSK_MODEL}"; \
    ls -la /model.tar.gz

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
RUN npm run build --workspace @saathi/pwa

FROM nginx:1.27-alpine
# nginx cannot read an environment variable from a config file, and Railway hands the port in at
# runtime. The official image's entrypoint substitutes templates on the way up; the filter limits
# it to PORT so nginx's own $uri and $host survive intact.
ENV NGINX_ENVSUBST_FILTER=PORT
ENV PORT=8080
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/pwa/dist /usr/share/nginx/html
# Served, not precached: 40-odd megabytes has no business in the service worker's install step.
# It is fetched deliberately, once, and cached by the app.
COPY --from=model /model.tar.gz /usr/share/nginx/html/models/vosk-hi.tar.gz

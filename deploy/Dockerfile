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
# A Railway variable is NOT a build variable until it is declared here. Vite bakes VITE_* values
# into the bundle at build time, and Docker hands a service variable to the build only through
# an ARG of the same name. On 17 September the pass public key was set on the service, the
# build ran without it, and the app shipped verifying passes against the development key — so
# the first real pass the server signed failed on the owner's phone. Every VITE_* the app reads
# is declared here, and a production build with no public key stops rather than shipping.
ARG VITE_PASS_PUBLIC_KEY=""
ARG VITE_PURCHASE_LIVE=""
ARG VITE_GATE_LIVE=""
ARG VITE_TESTING_TOOLS=""
RUN if [ -n "$RAILWAY_GIT_COMMIT_SHA" ] && [ -z "$VITE_PASS_PUBLIC_KEY" ]; then \
      echo "VITE_PASS_PUBLIC_KEY is not set on this service: a production build would verify passes with the development key. Refusing." >&2; \
      exit 1; \
    fi
RUN VITE_BUILD_SHA="$RAILWAY_GIT_COMMIT_SHA" \
    VITE_BUILD_TIME="$(date -u '+%d %b %H:%M')" \
    VITE_PASS_PUBLIC_KEY="$VITE_PASS_PUBLIC_KEY" \
    VITE_PURCHASE_LIVE="$VITE_PURCHASE_LIVE" \
    VITE_GATE_LIVE="$VITE_GATE_LIVE" \
    VITE_TESTING_TOOLS="$VITE_TESTING_TOOLS" \
    npm run build --workspace @saathi/pwa

# The card reader's engine, on our own origin (decision 032). The hotel's card is read on the
# phone and nowhere else, so the engine has to come from here: the worker, one core for each kind
# of phone (the worker picks the one the phone can run), and the English it reads with — all
# out of packages the lockfile pins, so nothing is fetched from anybody else's host at build
# time either. `best_int` English, the engine's own default: a card's small print photographed
# in a lobby is exactly the case where the faster data gives up accuracy.
#
# Copied in AFTER the build, so the Workbox precache never sees these files: a traveller who
# never reads a card never downloads them. Versioned in the path, so they can be cached forever.
FROM node:22-alpine AS ocr
WORKDIR /ocr/v7
COPY --from=build /repo/node_modules/tesseract.js/dist/worker.min.js ./
COPY --from=build /repo/node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js ./
COPY --from=build /repo/node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js ./
COPY --from=build /repo/node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js ./
COPY --from=build /repo/node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz ./
RUN ls -la /ocr/v7

FROM nginx:1.27-alpine
# nginx cannot read an environment variable from a config file, and Railway hands the port in at
# runtime. The official image's entrypoint substitutes templates on the way up; the filter limits
# it to PORT so nginx's own $uri and $host survive intact.
ENV NGINX_ENVSUBST_FILTER=PORT
ENV PORT=8080
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/pwa/dist /usr/share/nginx/html
COPY --from=ocr /ocr /usr/share/nginx/html/ocr

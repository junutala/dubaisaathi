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
RUN npm run build --workspace @saathi/pwa

FROM nginx:1.27-alpine
# nginx cannot read an environment variable from a config file, and Railway hands the port in at
# runtime. The official image's entrypoint substitutes templates on the way up; the filter limits
# it to PORT so nginx's own $uri and $host survive intact.
ENV NGINX_ENVSUBST_FILTER=PORT
ENV PORT=8080
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/pwa/dist /usr/share/nginx/html

FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Service URLs are relative (src/environments/environment.prod.js), so the
# same image runs in every environment. The Agora app ID is the one value still
# baked in: it is a public client identifier, not a secret.
ARG REACT_APP_AGORA_APP_ID
ENV REACT_APP_AGORA_APP_ID=$REACT_APP_AGORA_APP_ID

RUN npm run build

# nginx-unprivileged runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

LABEL org.opencontainers.image.source="https://github.com/YSTEM-LMS/react"

# Upstreams for nginx/default.conf.template, rendered at container start.
# Defaults are the Container Apps app names; compose overrides them.
ENV MIDDLEWARE_UPSTREAM=http://ystem-middleware \
    CHESS_SERVER_UPSTREAM=http://ystem-chessserver \
    STOCKFISH_UPSTREAM=http://ystem-stockfish \
    CHESS_CLIENT_UPSTREAM=http://ystem-chessclient

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 8080

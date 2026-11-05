# Debian slim, not Alpine: the bundled Stockfish binary is linked against
# glibc, which Alpine (musl) does not provide.
FROM node:24.21.0-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

LABEL org.opencontainers.image.source="https://github.com/YSTEM-LMS/react"

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .
RUN chmod +x src/bin/stockfish_11_linux src/bin/stockfish_11_mac

USER node

EXPOSE 8080
CMD [ "node", "src/index.js" ]

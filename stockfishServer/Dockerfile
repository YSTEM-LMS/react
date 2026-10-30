FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

LABEL org.opencontainers.image.source="https://github.com/YSTEM-LMS/react"

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .
RUN chmod +x src/bin/stockfish_11_linux src/bin/stockfish_11_mac

USER node

EXPOSE 8080
CMD [ "node", "src/index.js" ]

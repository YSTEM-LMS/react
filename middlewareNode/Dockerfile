FROM node:24.21.0-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1

LABEL org.opencontainers.image.source="https://github.com/YSTEM-LMS/react"

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# routes/chat.js creates logs/ and node-nlp saves model.nlp in the working
# directory at runtime, so the non-root user needs to own it.
RUN chown node:node /app

USER node

EXPOSE 8000
CMD [ "node", "src/server.js" ]

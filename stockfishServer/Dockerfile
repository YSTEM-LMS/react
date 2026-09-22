FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm ci --only=production

COPY . .
RUN chmod +x src/bin/stockfish_11_linux src/bin/stockfish_11_mac

EXPOSE 8080
CMD [ "node", "src/index.js" ]

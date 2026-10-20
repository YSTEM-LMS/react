FROM node:24.21.0-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 8000
CMD [ "node", "src/server.js" ]

FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001
CMD [ "node", "src/index.js" ]
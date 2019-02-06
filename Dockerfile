FROM node:8-alpine

#Update
RUN apk --no-cache update && \
    apk --no-cache upgrade && \
    
RUN mkdir -p /app/node_modules && chown -R node:node /app

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD [ "node", "app.js" ]

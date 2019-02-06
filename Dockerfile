FROM node:8-alpine

#Update
RUN apk --no-cache update && \
    apk --no-cache upgrade && \

# For TimeZone
#pass the TZ env var to the container to reflect host timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
     echo $TZ > /etc/timezone

RUN mkdir -p /app/node_modules && chown -R node:node /app

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD [ "node", "app.js" ]

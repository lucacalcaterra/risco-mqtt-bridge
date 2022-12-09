FROM node:hydrogen-alpine

ARG TZ=Europe/Rome
#Update
RUN apk --no-cache update && \
	apk --no-cache upgrade && \
	apk --update add \
	tzdata \
	curl \
	&& cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
	&& apk del tzdata

RUN mkdir -p /app/node_modules && chown -R node:node /app

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

COPY --chown=node:node . .

USER node

EXPOSE 3000

CMD [ "node", "app.js" ]

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

HEALTHCHECK --interval=240s --timeout=3s \
	CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000

CMD [ "node", "app.js" ]

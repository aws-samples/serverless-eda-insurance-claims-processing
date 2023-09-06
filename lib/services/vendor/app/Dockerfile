FROM node:18-alpine3.18

WORKDIR /work/

COPY ./package.json /work/package.json

RUN npm install

COPY . /work/

CMD node .
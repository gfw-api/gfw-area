FROM node:12.16-buster-slim
MAINTAINER info@vizzuality.com

ENV NAME gfw-area
ENV USER gfw-area

RUN apt-get update -y && apt-get upgrade -y && \
    apt-get install -y bash git ssh python3 make g++

RUN addgroup $USER && useradd -ms /bin/bash $USER -g $USER

RUN yarn global add grunt-cli bunyan

RUN mkdir -p /opt/$NAME
COPY package.json /opt/$NAME/package.json
COPY yarn.lock /opt/$NAME/yarn.lock
RUN cd /opt/$NAME && yarn install

COPY entrypoint.sh /opt/$NAME/entrypoint.sh
COPY config /opt/$NAME/config

WORKDIR /opt/$NAME

COPY ./app /opt/$NAME/app
RUN chown -R $USER:$USER /opt/$NAME

# Tell Docker we are going to use this ports
EXPOSE 4100


ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

CMD /wait

USER $USER

ENTRYPOINT ["./entrypoint.sh"]

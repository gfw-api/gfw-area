###############################################################################
# Use Amazon Linux 2023
###############################################################################
FROM amazonlinux:2023

# Metadata
LABEL maintainer="datalab@wri.org"

###############################################################################
# Environment Variables
###############################################################################
ARG NODE_VERSION=20.9.0
ENV NODE_VERSION=${NODE_VERSION} \
    NAME=gfw-area \
    USER=gfw-area \
    PATH=/usr/local/bin:$PATH

###############################################################################
# Install System Dependencies
###############################################################################
RUN dnf -y update \
 && dnf -y install tar xz bash git openssh python3 gcc g++ make \
 && dnf clean all \
 && rm -rf /var/cache/dnf

###############################################################################
# Install Node (ARM64 build)
###############################################################################
RUN curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-arm64.tar.xz" \
 && tar -xJf "node-v${NODE_VERSION}-linux-arm64.tar.xz" -C /usr/local --strip-components=1 \
 && rm "node-v${NODE_VERSION}-linux-arm64.tar.xz"

###############################################################################
# Verify Node Installation
###############################################################################
RUN node --version && npm --version

###############################################################################
# Create a Non-Root User
###############################################################################
RUN groupadd "$USER" \
 && useradd -s /bin/bash -m -g "$USER" "$USER"

###############################################################################
# Install Global Node Tools (Yarn, Grunt, Bunyan)
###############################################################################
RUN npm install --global yarn grunt-cli bunyan

###############################################################################
# Copy Only Package Files First for Better Caching
###############################################################################
WORKDIR /opt/${NAME}
COPY package.json yarn.lock ./

RUN yarn install

###############################################################################
# Copy the Rest of the Files
###############################################################################
COPY entrypoint.sh ./entrypoint.sh
COPY config ./config
COPY app ./app

###############################################################################
# Set Correct Ownership
###############################################################################
RUN chown -R "$USER":"$USER" /opt/${NAME}

###############################################################################
# Expose the Application Port
###############################################################################
EXPOSE 4100

###############################################################################
# Fetch docker-compose-wait
###############################################################################
RUN curl -sL "https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait" -o /wait \
 && chmod +x /wait

###############################################################################
# Set User and Entrypoint
###############################################################################
USER "$USER"
ENTRYPOINT ["./entrypoint.sh"]

###############################################################################
# Default CMD (docker-compose-wait)
###############################################################################
CMD ["/wait"]

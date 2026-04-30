FROM alpine:3.18

# Install dependencies
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    git \
    sudo \
    tar \
    gzip \
    ca-certificates \
    docker-cli \
    nodejs \
    npm

# Create runner user
RUN adduser -D -s /bin/bash runner \
    && echo 'runner ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

# Switch to runner user
USER runner
WORKDIR /home/runner

# Download and extract GitHub Actions runner
RUN RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name[1:]') \
    && curl -o actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz -L \
       https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && tar xzf actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz \
    && rm actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz

# Copy entrypoint script
COPY entrypoint.sh ./entrypoint.sh
USER root
RUN chmod +x /home/runner/entrypoint.sh
USER runner

ENTRYPOINT ["./entrypoint.sh"]

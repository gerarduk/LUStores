FROM myoung34/github-runner:latest

# Install additional tools for JWT generation
RUN apt-get update && apt-get install -y \
    jq \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy JWT generation script
COPY generate-app-token.sh /usr/local/bin/generate-app-token.sh
COPY entrypoint-with-jwt.sh /usr/local/bin/entrypoint-with-jwt.sh

RUN chmod +x /usr/local/bin/generate-app-token.sh \
    && chmod +x /usr/local/bin/entrypoint-with-jwt.sh

# Create secrets directory
RUN mkdir -p /app/secrets

ENTRYPOINT ["/usr/local/bin/entrypoint-with-jwt.sh"]

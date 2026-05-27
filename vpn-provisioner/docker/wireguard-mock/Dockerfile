FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV WG_INTERFACE=wg0
ENV WG_SERVER_IP=10.44.0.1
ENV WG_LISTEN_PORT=51820

RUN apt-get update && apt-get install -y --no-install-recommends \
    wireguard-tools \
    iproute2 \
    iptables \
    iputils-ping \
    dnsutils \
    qrencode \
    bash \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]


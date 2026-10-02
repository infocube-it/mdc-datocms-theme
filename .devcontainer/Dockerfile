# Development sandbox for the Seed. Based on Anthropic's reference devcontainer
# (github.com/anthropics/claude-code/.devcontainer), trimmed and extended for
# Next.js, Playwright, DatoCMS and Netlify.
FROM node:24-bookworm

ARG TZ=Europe/Rome
ENV TZ="$TZ"

# Development tools, plus iptables/ipset/dig/aggregate for the egress firewall.
RUN apt-get update && apt-get install -y --no-install-recommends \
  less \
  git \
  procps \
  sudo \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  nano \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# System libraries for Playwright's Chromium. Browsers themselves are installed
# per project (`npx playwright install chromium`) so they match package.json.
RUN npx -y playwright@latest install-deps chromium \
  && rm -rf /var/lib/apt/lists/* /root/.npm

# Let the non-root user own global npm packages.
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

# Persist shell history across rebuilds.
RUN mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R node /commandhistory \
  && echo "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" >> /home/node/.bashrc

ENV DEVCONTAINER=true

RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

USER node

ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
ENV SHELL=/bin/bash
ENV EDITOR=nano
ENV VISUAL=nano

ARG CLAUDE_CODE_VERSION=latest
ARG NETLIFY_CLI_VERSION=latest
RUN npm install -g \
  @anthropic-ai/claude-code@${CLAUDE_CODE_VERSION} \
  netlify-cli@${NETLIFY_CLI_VERSION}

# The firewall script is the only command the node user may run as root.
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod 0755 /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
  chmod 0440 /etc/sudoers.d/node-firewall
USER node

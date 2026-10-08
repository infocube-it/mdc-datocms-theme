# Keep the tag equal to the @playwright/test version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

# Outgoing firewall (init-firewall.sh). The remote user may run that one script
# as root and nothing else, so it can't lift the rules: it leaves the sudo group.
RUN apt-get update \
 && apt-get install -y --no-install-recommends sudo iptables \
 && rm -rf /var/lib/apt/lists/*
COPY init-firewall.sh /usr/local/sbin/init-firewall
RUN chmod 755 /usr/local/sbin/init-firewall \
 && if id -nG ubuntu | grep -qw sudo; then gpasswd -d ubuntu sudo; fi \
 && echo 'ubuntu ALL=(root) NOPASSWD: /usr/local/sbin/init-firewall' > /etc/sudoers.d/init-firewall \
 && chmod 440 /etc/sudoers.d/init-firewall

# GitHub CLI, from GitHub's apt repository, to read CI results with the
# read-only GH_TOKEN in devcontainer.env.
RUN mkdir -p -m 755 /etc/apt/keyrings \
 && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg -o /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && chmod 644 /etc/apt/keyrings/githubcli-archive-keyring.gpg \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends gh \
 && rm -rf /var/lib/apt/lists/*

# A new Docker volume copies this folder's owner, so ~/.claude stays writable.
RUN mkdir -p /home/ubuntu/.claude && chown ubuntu:ubuntu /home/ubuntu/.claude

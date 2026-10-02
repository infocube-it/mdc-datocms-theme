#!/bin/bash
# Deny-by-default egress firewall for the devcontainer. Based on Anthropic's
# reference script, with these changes:
# - project domains (DatoCMS, Netlify, Playwright downloads) added to the allowlist
# - the Docker host (default gateway) is unreachable, so host services are off limits
# - outbound SSH only goes to allowlisted addresses
# - IPv6 is dropped entirely
# - a domain that fails to resolve is a warning, not a fatal error
#
# DNS answers for CDN-backed domains rotate. If a whitelisted domain starts
# failing, re-run: sudo /usr/local/bin/init-firewall.sh
set -euo pipefail
IFS=$'\n\t'

ALLOWED_DOMAINS=(
  # npm
  "registry.npmjs.org"
  # Claude Code
  "api.anthropic.com"
  "console.anthropic.com"
  "platform.claude.com"
  "claude.ai"
  "mcp-proxy.anthropic.com"
  "statsig.com"
  "sentry.io"
  # VS Code server and extensions
  "marketplace.visualstudio.com"
  "vscode.blob.core.windows.net"
  "update.code.visualstudio.com"
  # DatoCMS
  "graphql.datocms.com"
  "graphql-listen.datocms.com"
  "site-api.datocms.com"
  "www.datocms-assets.com"
  "oauth.datocms.com"
  # Netlify
  "api.netlify.com"
  "app.netlify.com"
  # Playwright browser downloads
  "cdn.playwright.dev"
  "playwright.download.prss.microsoft.com"
)

# 1. Keep Docker's embedded DNS (127.0.0.11) working after the flush.
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

if [ -n "$DOCKER_DNS_RULES" ]; then
  echo "Restoring Docker DNS rules..."
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
else
  echo "No Docker DNS rules to restore"
fi

# 2. DNS and loopback.
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# 3. Build the allowlist.
ipset create allowed-domains hash:net

echo "Fetching GitHub IP ranges..."
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
  echo "ERROR: Failed to fetch GitHub IP ranges"
  exit 1
fi
if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
  echo "ERROR: GitHub API response missing required fields"
  exit 1
fi
while read -r cidr; do
  if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
    echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
    exit 1
  fi
  ipset add -exist allowed-domains "$cidr"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | grep -v ':' | aggregate -q)

for domain in "${ALLOWED_DOMAINS[@]}"; do
  ips=$(dig +noall +answer A "$domain" | awk '$4 == "A" {print $5}')
  if [ -z "$ips" ]; then
    echo "WARNING: Failed to resolve $domain, skipping"
    continue
  fi
  while read -r ip; do
    if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
      echo "ERROR: Invalid IP from DNS for $domain: $ip"
      exit 1
    fi
    ipset add -exist allowed-domains "$ip"
  done < <(echo "$ips")
  echo "Allowed $domain"
done

# 4. Container network (compose siblings), but not the Docker host itself.
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
  echo "ERROR: Failed to detect host IP"
  exit 1
fi
CONTAINER_NETWORK=$(ip -o -f inet addr show scope global | awk '{print $4}' | head -n1)
echo "Docker host $HOST_IP blocked; container network $CONTAINER_NETWORK allowed"
iptables -A OUTPUT -d "$HOST_IP" -j REJECT --reject-with icmp-admin-prohibited
iptables -A INPUT -s "$CONTAINER_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$CONTAINER_NETWORK" -j ACCEPT

# 5. Default deny, then allow replies and allowlisted destinations.
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

# 6. No IPv6 at all, except loopback.
if command -v ip6tables >/dev/null && ip6tables -L >/dev/null 2>&1; then
  ip6tables -F
  ip6tables -A INPUT -i lo -j ACCEPT
  ip6tables -A OUTPUT -o lo -j ACCEPT
  ip6tables -P INPUT DROP
  ip6tables -P FORWARD DROP
  ip6tables -P OUTPUT DROP
fi

echo "Firewall configured, verifying..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
  echo "ERROR: Firewall verification failed - was able to reach https://example.com"
  exit 1
fi
echo "OK: https://example.com is blocked"
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
  echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
  exit 1
fi
echo "OK: https://api.github.com is reachable"

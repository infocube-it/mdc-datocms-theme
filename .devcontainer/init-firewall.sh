#!/usr/bin/env bash
# Runs as root on every container start (container-init.sh, through sudo).
# Blocks outgoing traffic to the host and the local network, so the container
# reaches the internet but not the machines around it. DNS to the resolvers in
# /etc/resolv.conf stays open: Docker often hands the container the LAN router.
set -euo pipefail

chain=DEVCONTAINER-EGRESS
private_v4="10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 100.64.0.0/10 169.254.0.0/16 0.0.0.0/8 224.0.0.0/4 240.0.0.0/4"
private_v6="fc00::/7 fe80::/10 ff00::/8"

# Creates the chain, or empties it on a restart, and hooks it into OUTPUT once.
reset_chain() {
  local tables=$1
  "$tables" -N "$chain" 2>/dev/null || "$tables" -F "$chain"
  "$tables" -C OUTPUT -j "$chain" 2>/dev/null || "$tables" -I OUTPUT 1 -j "$chain"
  "$tables" -A "$chain" -o lo -j RETURN
  "$tables" -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
}

reset_chain iptables
for ns in $(awk '$1 == "nameserver" && $2 !~ /:/ {print $2}' /etc/resolv.conf); do
  iptables -A "$chain" -d "$ns" -p udp --dport 53 -j RETURN
  iptables -A "$chain" -d "$ns" -p tcp --dport 53 -j RETURN
done
for net in $private_v4; do
  iptables -A "$chain" -d "$net" -j REJECT
done

# IPv6 is usually off in Docker. Skip it only when the container has no IPv6
# address besides loopback; otherwise a failure must stop the start.
if reset_chain ip6tables 2>/dev/null; then
  for net in $private_v6; do
    ip6tables -A "$chain" -d "$net" -j REJECT
  done
elif awk '$6 != "lo"' /proc/net/if_inet6 2>/dev/null | grep -q .; then
  echo "init-firewall: IPv6 is on but ip6tables failed" >&2
  exit 1
fi

echo "init-firewall: host and local network blocked"

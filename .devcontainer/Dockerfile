# Keep the tag equal to the @playwright/test version in package.json.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

# A new Docker volume copies this folder's owner, so ~/.claude stays writable.
RUN mkdir -p /home/ubuntu/.claude && chown ubuntu:ubuntu /home/ubuntu/.claude

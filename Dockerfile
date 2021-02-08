FROM node:lts AS builder
COPY . /src
WORKDIR /src
RUN npm ci && \
    npm run fix-compatibility && \
    npm run build -- --modern


FROM nginx:stable-alpine

LABEL org.opencontainers.image.title="Unlock Music"
LABEL org.opencontainers.image.description="Unlock encrypted music file in browser"
LABEL org.opencontainers.image.authors="MengYX"
LABEL org.opencontainers.image.source="https://github.com/ix64/unlock-music"
LABEL org.opencontainers.image.licenses="MIT"
LABEL maintainer="MengYX"

COPY --from=builder /src/dist /usr/share/nginx/html

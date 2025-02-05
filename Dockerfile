FROM golang:1.23-alpine3.20 AS builder
ENV CGO_ENABLED=0
WORKDIR /backend
COPY backend/go.* .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
COPY backend/. .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -ldflags="-s -w" -o bin/service

FROM --platform=$BUILDPLATFORM node:20.18-alpine3.20 AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci
# install
COPY ui /ui
RUN npm run build


FROM debian:bullseye AS cli-stage
ARG TARGETARCH
COPY cli-${TARGETARCH}.sh .
RUN apt-get update && apt-get install -y curl bzip2 && \
    chmod +x cli-${TARGETARCH}.sh
RUN ./cli-${TARGETARCH}.sh

FROM debian:bullseye-slim
LABEL org.opencontainers.image.title="SQL container manager" \
    org.opencontainers.image.description="Create, connect, and manage SQL dev containers" \
    org.opencontainers.image.vendor="DrewSK.Tech" \
    com.docker.desktop.extension.api.version="0.3.4" \
    com.docker.extension.screenshots="[{\"alt\":\"SQL extension with container details expanded.\", \"url\":\"https://raw.githubusercontent.com/dzsquared/docker-sql-extension/main/images/screenshot2.png\"}, {\"alt\":\"SQL extension with two containers listed.\", \"url\":\"https://raw.githubusercontent.com/dzsquared/docker-sql-extension/main/images/screenshot1.png\"}]" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/dzsquared/docker-sql-extension/main/Database.png" \
    com.docker.extension.detailed-description="With the SQL extension you can create a new SQL container quickly in Docker Desktop. Select the version of SQL Server you want to use, enter a container name, SQL port, and generate a password before clicking the plus button to create the container. Once a container is created, you can start, stop, and delete it using the buttons in the extension tab. Connect to the container directly in the extension with the embedded sqlcmd tool or by using your preferred SQL client. For convenience the connection string is displayed in the extension tab and a button for launching Azure Data Studio is provided." \
    com.docker.extension.publisher-url="https://github.com/dzsquared/docker-sql-extension" \
    com.docker.extension.additional-urls="[{\"title\":\"Source code and notices\",\"url\":\"https://github.com/dzsquared/docker-sql-extension/blob/main/README.md\"},\
    {\"title\":\"License\",\"url\":\"https://github.com/dzsquared/docker-sql-extension/blob/main/LICENSE\"}]" \
    com.docker.extension.categories="database" \
    com.docker.extension.changelog="<h3>1.0, Initial release</h3><ul><li>SQL container creation</li><li>Connection strings</li><li>Add and list databases</li><li>Embedded sqlcmd CLI</li></ul>"

COPY --from=builder /backend/bin/service /
COPY --from=client-builder /ui/build ui
COPY --from=cli-stage /usr/bin/ttyd /usr/bin/ttyd
COPY --from=cli-stage /usr/bin/sqlcmd /usr/bin/sqlcmd
COPY docker-compose.yaml .
COPY metadata.json .
COPY database.svg .
COPY --chmod=0755 host /host

COPY sql.sh /cli/sql.sh
RUN chmod +x /cli/sql.sh 

CMD /service -socket /run/guest-services/backend.sock

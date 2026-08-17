FROM postgres:16-alpine

RUN apk add --no-cache curl restic

COPY backup.sh /usr/local/bin/backup
RUN sed -i 's/\r$//' /usr/local/bin/backup && chmod +x /usr/local/bin/backup

ENTRYPOINT ["/usr/local/bin/backup"]

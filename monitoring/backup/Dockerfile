FROM postgres:16-alpine

RUN apk add --no-cache curl restic

COPY backup.sh /usr/local/bin/backup
COPY restore.sh /usr/local/bin/restore
COPY crontab /etc/crontabs/root
RUN sed -i 's/\r$//' /usr/local/bin/backup /usr/local/bin/restore /etc/crontabs/root && chmod +x /usr/local/bin/backup /usr/local/bin/restore

ENTRYPOINT ["/usr/local/bin/backup"]
CMD ["schedule"]

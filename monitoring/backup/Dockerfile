FROM postgres:16-alpine

RUN apk add --no-cache curl restic

COPY backup.sh /usr/local/bin/backup
COPY crontab /etc/crontabs/root
RUN sed -i 's/\r$//' /usr/local/bin/backup /etc/crontabs/root && chmod +x /usr/local/bin/backup

ENTRYPOINT ["/usr/local/bin/backup"]
CMD ["schedule"]

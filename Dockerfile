FROM python:3.11-alpine

LABEL maintainer="fullstackjam@outlook.com"

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5000

ENV FLASK_ENV=production

ENV FLASK_DEBUG=False

CMD ["gunicorn", "-b", "0.0.0.0:5000", "watchlist:app"]

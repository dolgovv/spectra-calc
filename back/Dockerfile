FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist
# Шрифты для canvas и pdfkit: tsc собирает только .ts, в dist они не попадают.
COPY assets ./assets

EXPOSE 3000
CMD ["node", "dist/main.js"]

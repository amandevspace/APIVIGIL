FROM node:20-alpine
WORKDIR /app/metrics-service
COPY metrics-service/package*.json ./
RUN npm install --omit=dev
COPY metrics-service ./
COPY shared /app/shared
EXPOSE 4001
CMD ["npm", "start"]

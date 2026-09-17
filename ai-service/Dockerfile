FROM node:20-alpine
WORKDIR /app
COPY ai-service/package*.json ./
RUN npm install --omit=dev
COPY ai-service ./
EXPOSE 5000
CMD ["npm", "start"]

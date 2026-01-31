FROM node:18-alpine

# Create app dir
WORKDIR /usr/src/app

# Install deps
COPY package*.json ./
RUN npm ci --only=production

# Copy sources
COPY . .

# Use environment PORT (Koyeb provides)
EXPOSE 3000

CMD ["node", "src/index.js"]

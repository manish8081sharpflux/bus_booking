FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY api-gateway/package.json ./api-gateway/package.json
COPY auth-service/package.json ./auth-service/package.json
COPY booking-service/package.json ./booking-service/package.json
COPY operator-service/package.json ./operator-service/package.json
COPY search-service/package.json ./search-service/package.json
COPY tracking-service/package.json ./tracking-service/package.json
COPY consumers/package.json ./consumers/package.json
COPY notification-service/package.json ./notification-service/package.json
COPY whatsapp-service/package.json ./whatsapp-service/package.json

# package-lock.json predates the two newest workspaces, so npm install is used
# until the lock is refreshed on a networked development machine.
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

CMD ["npm", "run", "start:gateway"]

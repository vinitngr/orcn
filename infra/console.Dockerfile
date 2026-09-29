FROM node:20-bookworm

WORKDIR /app/apps/console

COPY apps/console/package.json apps/console/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

CMD ["pnpm", "run", "dev"]

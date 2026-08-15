FROM node:20-bookworm

WORKDIR /app/apps/web

COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install

CMD ["pnpm", "run", "dev"]

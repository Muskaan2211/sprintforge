FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install --workspace=@sprintforge/api --include-workspace-root
COPY apps/api apps/api
RUN npm run db:push -w @sprintforge/api -- --help >/dev/null 2>&1 || true
RUN cd apps/api && npx prisma generate && npm run build
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh","-c","npx prisma db push && node dist/index.js"]

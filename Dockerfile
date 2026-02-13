# Stage1: Build App
FROM node:22-bullseye AS builder

ENV HOME_DIR=/app
WORKDIR ${HOME_DIR}

COPY package.json package-lock.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY postcss.config.mjs ./
COPY tailwind.config.ts ./
COPY webapp.config.ts ./
COPY .gitmodules ./
COPY .env.production ./
COPY src ./src
COPY public ./public 
COPY .git ./.git

RUN apt-get update && \
    apt-get install -y --no-install-recommends g++ git make python3 && \
    rm -rf /var/lib/apt/lists/* && \
    git submodule update --init

WORKDIR ${HOME_DIR}/ei-geoint-web-interface
RUN npm ci --ignore-scripts || echo "no submodule package.json"
WORKDIR ${HOME_DIR}

RUN npm ci --ignore-scripts
RUN NEXT_SKIP_TURBOPACK=1 npm run build
RUN rm -rf ./.next/cache

# ---------------------------------------------------------------------

# Stage2: Run App
FROM node:22-bullseye AS runner

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app
ENV NODE_ENV=production
ENV MIDDLEWARE_DEBUG=true

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./

RUN npm ci --omit=dev --ignore-scripts && rm -rf package-lock.json

USER appuser
EXPOSE 3000
CMD ["npm", "start"]

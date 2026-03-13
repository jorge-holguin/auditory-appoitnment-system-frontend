FROM node:20-alpine AS builder

WORKDIR /app

<<<<<<< HEAD
COPY package.json ./
COPY .env ./
RUN npm install
=======
COPY package.json package-lock.json ./
RUN npm ci
>>>>>>> 117024d7a5a16c311d4dc47ba3e0aa870af7009f

COPY . .

ENV VITE_API_INTEROP_URL="VITE_API_INTEROP_URL_PLACEHOLDER"
ENV VITE_AUTH_API_URL="VITE_AUTH_API_URL_PLACEHOLDER"
ENV VITE_API_CITAS_URL="VITE_API_CITAS_URL_PLACEHOLDER"

RUN npm run build

FROM nginx:stable-alpine AS runner

COPY entrypoint.sh /docker-entrypoint.d/99-env-injector.sh
RUN chmod +x /docker-entrypoint.d/99-env-injector.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

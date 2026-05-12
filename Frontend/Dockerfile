FROM node:18-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Make API base relative in production build (see src/lib/api.ts).
# Using "/" results in empty base after trimming.
ARG VITE_API_BASE=/
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build


FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080


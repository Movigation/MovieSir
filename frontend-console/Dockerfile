# MovieSir B2B Console - Production
FROM node:18-alpine as build

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 빌드
COPY . .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npx vite build

# 프로덕션 서버
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.local.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

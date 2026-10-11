# ==========================================
# Estágio 1: Build do Angular
# ==========================================
FROM node:alpine AS builder

WORKDIR /app

# Copia dependências para aproveitar cache do Docker
COPY package*.json ./
RUN npm ci

# Copia código-fonte e compila em modo produção
COPY . .
RUN npm run build

# ==========================================
# Estágio 2: Servidor Web Nginx
# ==========================================
FROM nginx:alpine

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia arquivos estáticos compilados da SPA
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Copia configuração customizada do Nginx na porta 4200
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4200

CMD ["nginx", "-g", "daemon off;"]

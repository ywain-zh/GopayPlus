FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HEADFUL=0 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p product_files debug_screenshots

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/public/runtime',res=>process.exit(res.statusCode>=200&&res.statusCode<300?0:1));req.on('error',()=>process.exit(1));req.setTimeout(4000,()=>{req.destroy();process.exit(1);});"

CMD ["node", "server.js"]

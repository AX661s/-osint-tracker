# 前端 Dockerfile - 直接使用本地构建的文件
FROM nginx:alpine

# 复制本地已构建的文件
COPY build/ /usr/share/nginx/html/

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

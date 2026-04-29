FROM nginx:1.27-alpine

# 清除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制 nginx 配置（通过 volume 挂入，此处只需要一个空操作占位）
# 实际配置由 docker-compose 的 volume 挂载提供

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

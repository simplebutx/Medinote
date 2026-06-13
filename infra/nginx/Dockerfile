FROM nginx:1.27-alpine

# 기존 기본 설정 삭제
RUN rm /etc/nginx/conf.d/default.conf

# 우리 프로젝트의 설정 파일 복사
COPY api-gateway.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

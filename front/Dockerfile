# Packages an existing build (front/dist) - nothing is compiled here.
FROM nginx:1.30-alpine
LABEL app=spectra-calc
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist /usr/share/nginx/html

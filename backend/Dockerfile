#######################
# Step 1: Base target #
#######################
FROM node:12.14.0-slim as base
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG npm_registry
ARG MIRROR_DEBIAN
ARG NPM_FIX
ARG NPM_LATEST
ARG NPM_VERBOSE
ARG app_path
ARG app_name
ARG port

# Base dir /app
WORKDIR /$app_path

# update debian w/proxy & mirror
RUN echo "$http_proxy $no_proxy" && set -x && [ -z "$MIRROR_DEBIAN" ] || \
   sed -i.orig -e "s|http://deb.debian.org\([^[:space:]]*\)|$MIRROR_DEBIAN/debian9|g ; s|http://security.debian.org\([^[:space:]]*\)|$MIRROR_DEBIAN/debian9-security|g" /etc/apt/sources.list
RUN apt-get update -q

# use proxy & private npm registry
RUN if [ ! -z "$http_proxy" ] ; then \
        npm config delete proxy; \
        npm config set proxy $http_proxy; \
        npm config set https-proxy $https_proxy; \
        npm config set no-proxy $no_proxy; \
   fi ; \
   [ -z "$npm_registry" ] || npm config set registry=$npm_registry

RUN [ -z "${NPM_LATEST}" ] || npm i npm@latest -g

COPY package.json ./
COPY tsconfig.json ./
COPY tslint.json ./
COPY tsoa.json ./

RUN pwd
RUN ls *

RUN npm --no-git-tag-version version ${APP_VERSION}
RUN if [ -z "${NPM_VERBOSE}" ]; then\
      npm install;  \
    else \
      npm install --verbose; \
    fi

#RUN if [ -z "${NPM_FIX}" ]; then \
#      npm audit --registry=https://registry.npmjs.org; \
#    else \
#      npm audit fix --registry=https://registry.npmjs.org; \
#    fi


################################
# Step 2: "development" target #
################################
FROM base as development
ARG app_ver
ARG app_path
ENV APP_VERSION ${app_ver}
ENV NPM_CONFIG_LOGLEVEL debug

VOLUME /${app_path}/src
VOLUME /${app_path}/dist

# Expose the listening port of your app
EXPOSE ${port}

CMD ["npm","run", "dev"]

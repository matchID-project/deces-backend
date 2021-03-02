#######################
# Step 1: Base target #
#######################
FROM node:12.14.0-slim as base
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG npm_registry
ARG MIRROR_DEBIAN
ARG NPM_LATEST
ARG app_path

# Base dir /app
WORKDIR /$app_path

# update debian w/proxy & mirror
RUN echo "$http_proxy $no_proxy" && set -x && [ -z "$MIRROR_DEBIAN" ] || \
   sed -i.orig -e "s|http://deb.debian.org\([^[:space:]]*\)|$MIRROR_DEBIAN/debian9|g ; s|http://security.debian.org\([^[:space:]]*\)|$MIRROR_DEBIAN/debian9-security|g" /etc/apt/sources.list

# use proxy & private npm registry
RUN if [ ! -z "$http_proxy" ] ; then \
        npm config delete proxy; \
        npm config set proxy $http_proxy; \
        npm config set https-proxy $https_proxy; \
        npm config set no-proxy $no_proxy; \
   fi ; \
   [ -z "$npm_registry" ] || npm config set registry=$npm_registry

RUN [ -z "${NPM_LATEST}" ] || npm i npm@latest -g

HEALTHCHECK --interval=5m --timeout=2m --start-period=45s \
   CMD curl -f --silent --retry 6 --max-time 5 --retry-delay 10 --retry-max-time 60 "http://localhost:8080/deces/api/v1/healthcheck" || bash -c 'kill -s 15 -1 && (sleep 10; kill -s 9 -1)'

################################
# Step 2: "development" target #
################################
FROM base as development
ARG app_ver
ARG app_path
ARG app_name
ARG port
ARG NPM_FIX
ARG NPM_VERBOSE
ENV APP_VERSION ${app_ver}
ENV NPM_CONFIG_LOGLEVEL debug

COPY package.json ./

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

VOLUME /${app_path}/src
VOLUME /${app_path}/dist
VOLUME /${app_path}/tests
VOLUME /${app_path}/data

COPY tsconfig.json ./
COPY .eslintrc.js ./

# Expose the listening port of your app
EXPOSE ${port}

CMD ["npm","run", "dev"]


###############################
# Step 3: "production" target #
###############################
FROM base as production
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG npm_registry
ARG MIRROR_DEBIAN
ARG app_path
ARG port
ARG app_name
ARG app_ver
ARG NPM_AUDIT_DRY_RUN
ENV NODE_ENV=production
ENV APP_VERSION=${app_ver}

COPY package.json ./

# Install production dependencies and clean cache
RUN npm install --production && \
    npm config set audit-level moderate && \
    npm audit --json --registry=https://registry.npmjs.org || ${NPM_AUDIT_DRY_RUN:-false} && \
    npm cache clean --force

COPY ${app_name}-${app_ver}-backend-dist.tar.gz .

RUN  [ -f "${app_name}-${app_ver}-backend-dist.tar.gz" ] && \
     tar -zxvf ${app_name}-${app_ver}-backend-dist.tar.gz  && \
     rm -rf ${app_name}-${app_ver}-backend-dist.tar.gz

ADD tests ./tests
ADD data ./data

# Expose the listening port of your app
EXPOSE ${port}

CMD ["npm","run", "start"]

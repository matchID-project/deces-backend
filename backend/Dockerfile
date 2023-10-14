#######################
# Step 1: Base target #
#######################
FROM node:19-slim as base
ARG http_proxy
ARG https_proxy
ARG no_proxy
ARG npm_registry
ARG npm_ssl
ARG MIRROR_DEBIAN
ARG NPM_LATEST
ARG app_path

# Base dir /app
WORKDIR /$app_path

# update debian w/proxy & mirror
RUN echo "$http_proxy $no_proxy" && set -x && [ -z "$MIRROR_DEBIAN" ] || \
   sed -i.orig -e "s|http://deb.debian.org\([^[:space:]]*\)|$MIRROR_DEBIAN/debian9|g ; s|http://security.debian.org\([^[:space:]]*\)|$MIRROR_DEBIAN/debian9-security|g" /etc/apt/sources.list && \
   apt-get update -yq && apt-get -y upgrade && apt-get install -y curl

# use proxy & private npm registry
RUN if [ ! -z "$http_proxy" ] ; then \
        npm config delete proxy; \
        npm config set proxy $http_proxy; \
        npm config set https-proxy $https_proxy; \
        npm config set no-proxy $no_proxy; \
   fi ; \
   [ -z "$npm_registry" ] || npm config set registry=$npm_registry; \
   [ -z "$npm_ssl" ] || npm config set strict-ssl false ;

RUN [ -z "${NPM_LATEST}" ] || npm i npm@latest -g

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

##########################
# Step 3: "build" target #
##########################
FROM development as build

ADD src ./src

COPY tsconfig.json ./
COPY .eslintrc.js ./

RUN npm run build && tar czvf dist.tar.gz dist

###############################
# Step 4: "production" target #
###############################
FROM node:20.2-alpine3.16 as production
ARG app_path
ARG port
ARG app_ver
ARG NPM_AUDIT_DRY_RUN
ENV NODE_ENV=production

WORKDIR /$app_path

COPY package.json ./
ADD tests ./tests
ADD data ./data

# Install production dependencies and clean cache
RUN npm install --production && \
    npm config set audit-level high && \
    npm audit --json --registry=https://registry.npmjs.org || ${NPM_AUDIT_DRY_RUN:-false} && \
    npm cache clean --force

COPY --from=build /${app_path}/dist.tar.gz /${app_path}/

RUN apk --no-cache add curl tar && \
    tar -zxvf dist.tar.gz  && \
    rm -rf dist.tar.gz && apk del tar

HEALTHCHECK --interval=5m --timeout=2m --start-period=45s \
   CMD curl -f --silent --retry 6 --max-time 5 --retry-delay 10 --retry-max-time 60 "http://localhost:8080/deces/api/v1/healthcheck" || bash -c 'kill -s 15 -1 && (sleep 10; kill -s 9 -1)'

# Expose the listening port of your app
EXPOSE ${port}

CMD ["npm","run", "start"]

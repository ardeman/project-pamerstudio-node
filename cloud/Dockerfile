# The render image: the render scripts as they run on the Mac, with Node,
# Google Chrome, Playwright and ffmpeg. Build it with cloud/build.sh.
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg fonts-noto-core fonts-noto-color-emoji ca-certificates curl fontconfig \
  && mkdir -p /usr/share/fonts/truetype/nunito \
  # Nunito (OFL) stands in for SF Pro Rounded on Linux cloud renders (Coba Lagi).
  && curl -fsSL -o /usr/share/fonts/truetype/nunito/Nunito.ttf \
    'https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/Nunito%5Bwght%5D.ttf' \
  && fc-cache -f \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /studio
# The Mac links Playwright from the app repo; keep this the same version.
RUN npm install --no-save --no-package-lock playwright@1.64.0 \
  && npx playwright install --with-deps chrome \
  && rm -rf /root/.npm

# Chrome runs without its sandbox here: Cloud Run is the sandbox, and the
# container has no user namespaces for Chrome's own.
RUN printf '#!/bin/sh\nexec /usr/bin/google-chrome --no-sandbox "$@"\n' > /usr/local/bin/chrome \
  && chmod +x /usr/local/bin/chrome
ENV CHROME=/usr/local/bin/chrome

COPY . .
CMD ["node", "cloud/check.mjs"]

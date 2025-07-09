FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
    nodejs \
    build-essential \
    cmake \
    git \
    libbrotli-dev \
    libgif-dev \
    libjpeg62-turbo-dev \
    libopenexr-dev \
    libpng-dev \
    libwebp-dev \
    pkg-config \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /
RUN git clone https://github.com/libjxl/libjxl.git --recursive
WORKDIR /libjxl
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF && \
    cmake --build . -- -j$(nproc) && \
    cmake --build . --target install

WORKDIR /src
COPY . .
RUN dotnet publish "jxl-converter.Server/jxl-converter.Server.csproj" -c Release -o /app/publish


FROM mcr.microsoft.com/dotnet/aspnet:8.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    libbrotli1 \
    libgif7 \
    libjpeg62-turbo \
    libopenexr-3-1-30 \
    libpng16-16 \
    libwebp7 \
    ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/publish . 
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY --from=builder /usr/local/lib/ /usr/local/lib/

RUN echo "/usr/local/lib" > /etc/ld.so.conf.d/libjxl.conf && ldconfig
ENV LD_LIBRARY_PATH=/usr/local/lib:$LD_LIBRARY_PATH

ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "jxl-converter.Server.dll"]

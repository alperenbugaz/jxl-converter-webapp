FROM mcr.microsoft.com/dotnet/sdk:8.0 AS builder

RUN apt-get update && apt-get install -y \
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
    ffmpeg

WORKDIR /
RUN git clone https://github.com/libjxl/libjxl.git --recursive
WORKDIR /libjxl
RUN mkdir build && cd build && \
    cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF && \
    cmake --build . -- -j$(nproc) && \
    cmake --build . --target install

WORKDIR /src
COPY ["jxl-converter.Server/jxl-converter.Server.csproj", "jxl-converter.Server/"]
RUN dotnet restore "jxl-converter.Server/jxl-converter.Server.csproj"
COPY ["jxl-converter.Server/", "jxl-converter.Server/"]
RUN dotnet publish "jxl-converter.Server/jxl-converter.Server.csproj" -c Release -o /app/publish


FROM mcr.microsoft.com/dotnet/aspnet:8.0

RUN apt-get update && apt-get install -y --no-install-recommends \
    libbrotli1 \
    libgif7 \
    libjpeg62-turbo \
    libopenexr-3-1-30 \
    libpng16-16 \
    libwebp7 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/cjxl /usr/local/bin/
COPY --from=builder /usr/local/bin/djxl /usr/local/bin/
COPY --from=builder /usr/local/lib/libjxl* /usr/local/lib/
RUN ldconfig

WORKDIR /app
COPY --from=builder /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "jxl-converter.Server.dll"]
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY DatMonAnOnline.API.csproj ./
RUN dotnet restore DatMonAnOnline.API.csproj

COPY . .
RUN dotnet publish DatMonAnOnline.API.csproj -c Release --no-restore -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /out .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "DatMonAnOnline.API.dll"]
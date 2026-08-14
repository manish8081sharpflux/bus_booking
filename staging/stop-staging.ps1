$EnvFile=Join-Path $PSScriptRoot '.env.staging'
docker compose --env-file $EnvFile -f (Join-Path $PSScriptRoot 'docker-compose.staging.yml') down

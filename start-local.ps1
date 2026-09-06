$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin"
$mysqlDataDir = "C:\ProgramData\MySQL\MySQL Server 8.4\Data"
$mavenBin = "$env:USERPROFILE\.m2\wrapper\dists\apache-maven-3.9.12\59fe215c0ad6947fea90184bf7add084544567b927287592651fda3782e0e798\bin"
$projectDir = $PSScriptRoot

# Cargar variables de entorno desde .env.local
Get-Content "$projectDir\.env.local" | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], "Process")
    }
}

# Arrancar MySQL si no está corriendo
if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
    Write-Output "Iniciando MySQL..."
    Start-Process -FilePath "$mysqlBin\mysqld.exe" -ArgumentList "--datadir=`"$mysqlDataDir`"","--port=3306" -WindowStyle Hidden
    Start-Sleep -Seconds 5
} else {
    Write-Output "MySQL ya está corriendo."
}

Set-Location $projectDir
& "$mavenBin\mvn.cmd" spring-boot:run

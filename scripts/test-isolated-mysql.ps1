param([string]$Filter = 'FullyQualifiedName~CartConcurrencyTests')
$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$testDataPath = Join-Path $workspace '.build-check\audit-mysql-20261024'
$serverPath = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
$adminPath = 'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqladmin.exe'
if (!(Test-Path -LiteralPath $serverPath)) { throw 'MySQL 8.0 test binary is not installed.' }
if (Get-NetTCPConnection -LocalPort 13487 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 13487 is occupied; refusing to touch the existing process.'
}
if (!(Test-Path -LiteralPath $testDataPath)) {
    New-Item -ItemType Directory -Path $testDataPath | Out-Null
    & $serverPath --no-defaults --initialize-insecure "--datadir=$testDataPath" --lower-case-table-names=1
    if ($LASTEXITCODE -ne 0) { throw 'Test MySQL initialization failed.' }
}
if ((Get-Item -LiteralPath $testDataPath).Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw 'Test data directory must not be a link.'
}
$previousFlag = $env:FOODIE_RUN_MYSQL_TESTS
$testServer = $null
$testExit = 1
try {
    $testServer = Start-Process -FilePath $serverPath -WindowStyle Hidden -PassThru -ArgumentList @(
        '--no-defaults', "--datadir=$testDataPath", '--lower-case-table-names=1',
        '--port=13487', '--bind-address=127.0.0.1', '--mysqlx=OFF', '--skip-log-bin')
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        if ($testServer.HasExited) { throw 'Test MySQL stopped before becoming ready.' }
        $probe = New-Object Net.Sockets.TcpClient
        try { $probe.Connect('127.0.0.1', 13487); $ready = $true } catch { } finally { $probe.Dispose() }
        if ($ready) { break }
        Start-Sleep -Milliseconds 100
    }
    if (!$ready) { throw 'Test MySQL did not become ready.' }
    $env:FOODIE_RUN_MYSQL_TESTS = '1'
    $testArguments = @('test', (Join-Path $workspace 'DatMonAnOnline.Tests\DatMonAnOnline.Tests.csproj'), '--no-restore', '-v', 'minimal')
    if (![string]::IsNullOrWhiteSpace($Filter)) { $testArguments += @('--filter', $Filter) }
    & dotnet @testArguments
    $testExit = $LASTEXITCODE
}
finally {
    $env:FOODIE_RUN_MYSQL_TESTS = $previousFlag
    if ($testServer -and !$testServer.HasExited) {
        & $adminPath --no-defaults --default-character-set=utf8mb4 --host=127.0.0.1 --port=13487 --user=root shutdown
        if (!$testServer.WaitForExit(10000)) { $testServer.Kill() }
    }
}
exit $testExit

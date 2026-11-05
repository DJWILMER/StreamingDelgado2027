# ============================================================
#  DJ WILMER · Servidor local para probar la PWA
#  Uso:  powershell -ExecutionPolicy Bypass -File server.ps1
#        powershell -ExecutionPolicy Bypass -File server.ps1 -Port 5500
#
#  La PWA necesita http:// o https:// para instalar el Service Worker.
#  Abrir file:///... NO permite instalación ni modo offline.
# ============================================================
param(
  [int]$Port = 8080,
  [string]$Root = ''
)

$ErrorActionPreference = 'Stop'

if (-not $Root) {
  $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$Root = (Resolve-Path -LiteralPath $Root).Path
$RootPrefix = $Root.TrimEnd('\') + '\'

$mimeTypes = @{
  '.html'  = 'text/html; charset=utf-8'
  '.htm'   = 'text/html; charset=utf-8'
  '.css'   = 'text/css; charset=utf-8'
  '.js'    = 'application/javascript; charset=utf-8'
  '.mjs'   = 'application/javascript; charset=utf-8'
  '.json'  = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'   = 'image/svg+xml'
  '.png'   = 'image/png'
  '.jpg'   = 'image/jpeg'
  '.jpeg'  = 'image/jpeg'
  '.webp'  = 'image/webp'
  '.gif'   = 'image/gif'
  '.ico'   = 'image/x-icon'
  '.woff'  = 'font/woff'
  '.woff2' = 'font/woff2'
  '.ttf'   = 'font/ttf'
  '.mp3'   = 'audio/mpeg'
  '.aac'   = 'audio/aac'
  '.m3u8'  = 'application/vnd.apple.mpegurl'
  '.txt'   = 'text/plain; charset=utf-8'
  '.map'   = 'application/json; charset=utf-8'
}

function Write-Response {
  param(
    [System.IO.Stream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body,
    [hashtable]$ExtraHeaders = @{}
  )

  if ($null -eq $Body) { $Body = [byte[]]@() }

  $headers = New-Object System.Text.StringBuilder
  [void]$headers.Append("HTTP/1.1 $StatusCode $StatusText`r`n")
  [void]$headers.Append("Content-Type: $ContentType`r`n")
  [void]$headers.Append("Content-Length: $($Body.Length)`r`n")
  [void]$headers.Append("Cache-Control: no-store, no-cache, must-revalidate`r`n")
  [void]$headers.Append("Service-Worker-Allowed: /`r`n")
  [void]$headers.Append("Connection: close`r`n")
  foreach ($key in $ExtraHeaders.Keys) {
    [void]$headers.Append("$key`: $($ExtraHeaders[$key])`r`n")
  }
  [void]$headers.Append("`r`n")

  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers.ToString())
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) {
    $Stream.Write($Body, 0, $Body.Length)
  }
  $Stream.Flush()
}

function Get-ContentType([string]$path) {
  $ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
  if ($mimeTypes.ContainsKey($ext)) { return $mimeTypes[$ext] }
  return 'application/octet-stream'
}

$address = [System.Net.IPAddress]::Loopback
$listener = New-Object System.Net.Sockets.TcpListener($address, $Port)
$listener.Start()

Write-Host ''
Write-Host '  DJ WILMER · Servidor local' -ForegroundColor Yellow
Write-Host "  http://localhost:$Port/" -ForegroundColor Cyan
Write-Host "  Raíz: $Root"
Write-Host '  Presiona Ctrl+C para detener.' -ForegroundColor DarkGray
Write-Host ''

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $client.ReceiveTimeout = 10000
    $client.SendTimeout = 15000

    try {
      $stream = $client.GetStream()
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 2048, $true)
      $requestLine = $reader.ReadLine()

      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

      # Consumir encabezados hasta la línea vacía.
      while ($true) {
        $line = $reader.ReadLine()
        if ($null -eq $line -or $line -eq '') { break }
      }

      $parts = $requestLine.Split(' ')
      if ($parts.Length -lt 2) {
        Write-Response $stream 400 'Bad Request' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Solicitud inválida.'))
        continue
      }

      $method = $parts[0].ToUpperInvariant()
      $rawTarget = $parts[1]
      $pathOnly = $rawTarget.Split('?')[0]
      $decoded = [System.Uri]::UnescapeDataString($pathOnly)

      if ($method -ne 'GET' -and $method -ne 'HEAD') {
        Write-Response $stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Método no permitido.')) @{ 'Allow' = 'GET, HEAD' }
        continue
      }

      $relative = $decoded.TrimStart('/').Replace('/', '\')
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }

      $candidate = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))

      if (-not $candidate.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -and
          $candidate -ne $Root) {
        Write-Response $stream 403 'Forbidden' 'text/plain; charset=utf-8' ([System.Text.Encoding]::UTF8.GetBytes('Acceso denegado.'))
        continue
      }

      if (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = Join-Path $candidate 'index.html'
      }

      if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $notFound = [System.Text.Encoding]::UTF8.GetBytes('<h1>404 · No encontrado</h1><p>DJ WILMER</p>')
        Write-Response $stream 404 'Not Found' 'text/html; charset=utf-8' $notFound
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($candidate)
      $contentType = Get-ContentType $candidate

      if ($method -eq 'HEAD') {
        Write-Response $stream 200 'OK' $contentType ([byte[]]@())
      } else {
        Write-Response $stream 200 'OK' $contentType $bytes
      }
    } catch {
      # Un cliente que cierra la conexión no debe tumbar el servidor.
    } finally {
      try { $client.Close() } catch { }
    }
  }
} finally {
  $listener.Stop()
  Write-Host ''
  Write-Host 'Servidor detenido.' -ForegroundColor DarkGray
}

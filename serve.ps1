param(
  [int]$Port = 3000,
  [switch]$StrictPort
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

$listener = $null
$activePort = $null
$maxAttempts = 30

for ($offset = 0; $offset -lt $maxAttempts; $offset++) {
  $candidatePort = $Port + $offset
  $candidatePrefix = "http://localhost:$candidatePort/"
  $candidateListener = New-Object System.Net.HttpListener
  $candidateListener.Prefixes.Add($candidatePrefix)

  try {
    $candidateListener.Start()
    $listener = $candidateListener
    $activePort = $candidatePort
    break
  }
  catch {
    $candidateListener.Close()

    if ($StrictPort) {
      throw
    }

    if ($offset -eq ($maxAttempts - 1)) {
      throw
    }
  }
}

if ($null -eq $listener) {
  throw 'Cannot start local web server.'
}

$prefix = "http://localhost:$activePort/"
if ($activePort -ne $Port) {
  Write-Host "Port $Port is busy. Switched to port $activePort." -ForegroundColor Yellow
}

Write-Host "QLTS web is running at $prefix"
Write-Host 'Press Ctrl+C to stop.'

try {
  while ($listener.IsListening) {
    try {
      $context = $listener.GetContext()
    }
    catch {
      break
    }

    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($requestPath) -or $requestPath -eq '/') {
      $requestPath = '/index.html'
    }

    $relativePath = $requestPath.TrimStart('/').Replace('/', '\\')
    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $relativePath))

    if (-not $fullPath.StartsWith($projectRoot, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $fullPath -PathType Leaf)) {
      $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
      $context.Response.StatusCode = 404
      $context.Response.ContentType = 'text/plain; charset=utf-8'
      $context.Response.ContentLength64 = $notFoundBytes.Length
      $context.Response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
      $context.Response.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
    $contentType = switch ($ext) {
      '.html' { 'text/html; charset=utf-8' }
      '.css' { 'text/css; charset=utf-8' }
      '.js' { 'application/javascript; charset=utf-8' }
      '.json' { 'application/json; charset=utf-8' }
      '.png' { 'image/png' }
      '.jpg' { 'image/jpeg' }
      '.jpeg' { 'image/jpeg' }
      '.gif' { 'image/gif' }
      '.svg' { 'image/svg+xml' }
      '.ico' { 'image/x-icon' }
      '.webp' { 'image/webp' }
      '.woff' { 'font/woff' }
      '.woff2' { 'font/woff2' }
      '.ttf' { 'font/ttf' }
      '.txt' { 'text/plain; charset=utf-8' }
      default { 'application/octet-stream' }
    }

    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
}
finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }
  $listener.Close()
}
# Genera el logo y los iconos PWA de DJ WILMER con System.Drawing (Windows PowerShell).
# Uso: powershell -ExecutionPolicy Bypass -File tools\generate-icons.ps1
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Common -ErrorAction SilentlyContinue

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$imgDir = Join-Path $root 'assets\img'
$iconDir = Join-Path $root 'icons'
New-Item -ItemType Directory -Force -Path $imgDir, $iconDir | Out-Null

function New-Graphics([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  return @($bmp, $g)
}

function Add-RoundRect($g, $rect, [int]$radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-Vinyl([System.Drawing.Graphics]$g, [int]$size, [bool]$withText, [double]$scale = 1.0) {
  $cx = $size / 2.0
  $cy = $size / 2.0
  $base = [Math]::Min($cx, $cy) * 0.94 * $scale

  # Halo exterior
  for ($i = 8; $i -ge 1; $i--) {
    $a = [int](10 + (9 - $i) * 2)
    $r = $base - ($i * 3)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($a, 255, 69, 0))
    $g.FillEllipse($brush, [single]($cx - $r), [single]($cy - $r), [single]($r * 2), [single]($r * 2))
    $brush.Dispose()
  }

  # Disco de vinilo
  $discRect = New-Object System.Drawing.RectangleF([single]($cx - $base), [single]($cy - $base), [single]($base * 2), [single]($base * 2))
  $discPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $discPath.AddEllipse($discRect)
  $discBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($discPath)
  $discBrush.CenterPoint = New-Object System.Drawing.PointF([single]($cx - $base * 0.25), [single]($cy - $base * 0.28))
  $discBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 44, 20, 18)
  $discBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 5, 4, 4))
  $g.FillPath($discBrush, $discPath)
  $discBrush.Dispose()
  $discPath.Dispose()

  # Surcos
  for ($r = $base - 8; $r -gt $base * 0.30; $r -= ($base * 0.018)) {
    $alpha = if (($r / $base) -lt 0.55) { 18 } else { 30 }
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255), [single]([Math]::Max(1, $base / 420)))
    $g.DrawEllipse($pen, [single]($cx - $r), [single]($cy - $r), [single]($r * 2), [single]($r * 2))
    $pen.Dispose()
  }

  # Aro naranja exterior
  $rimGlow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 255, 69, 0), [single]($base * 0.06))
  $g.DrawEllipse($rimGlow, [single]($cx - $base), [single]($cy - $base), [single]($base * 2), [single]($base * 2))
  $rimGlow.Dispose()
  $rim = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 90, 20), [single]([Math]::Max(2, $base * 0.014)))
  $g.DrawEllipse($rim, [single]($cx - $base + 2), [single]($cy - $base + 2), [single](($base - 2) * 2), [single](($base - 2) * 2))
  $rim.Dispose()

  # Etiqueta central
  $labelR = $base * 0.47
  $labelRect = New-Object System.Drawing.RectangleF([single]($cx - $labelR), [single]($cy - $labelR), [single]($labelR * 2), [single]($labelR * 2))
  $labelPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $labelPath.AddEllipse($labelRect)
  $labelBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $labelRect,
    [System.Drawing.Color]::FromArgb(255, 255, 122, 24),
    [System.Drawing.Color]::FromArgb(255, 196, 16, 38),
    45.0)
  $g.FillPath($labelBrush, $labelPath)
  $labelBrush.Dispose()
  $labelPath.Dispose()

  $labelRing = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(190, 255, 255, 255), [single]([Math]::Max(1.5, $base * 0.008)))
  $g.DrawEllipse($labelRing, [single]($cx - $labelR + 6), [single]($cy - $labelR + 6), [single](($labelR - 6) * 2), [single](($labelR - 6) * 2))
  $labelRing.Dispose()

  if ($withText) {
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 40, 0, 0))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $fDj = New-Object System.Drawing.Font('Arial Black', [single]($labelR * 0.30), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fName = New-Object System.Drawing.Font('Arial Black', [single]($labelR * 0.34), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $fSub = New-Object System.Drawing.Font('Arial', [single]($labelR * 0.135), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)

    $rDj = New-Object System.Drawing.RectangleF([single]($cx - $labelR), [single]($cy - $labelR * 0.72), [single]($labelR * 2), [single]($labelR * 0.55))
    $rName = New-Object System.Drawing.RectangleF([single]($cx - $labelR), [single]($cy - $labelR * 0.24), [single]($labelR * 2), [single]($labelR * 0.58))
    $rSub = New-Object System.Drawing.RectangleF([single]($cx - $labelR), [single]($cy + $labelR * 0.30), [single]($labelR * 2), [single]($labelR * 0.36))

    $off = [single]([Math]::Max(1, $labelR * 0.018))
    $g.DrawString('DJ', $fDj, $shadow, (New-Object System.Drawing.RectangleF([single]($rDj.X + $off), [single]($rDj.Y + $off), [single]$rDj.Width, [single]$rDj.Height)), $sf)
    $g.DrawString('DJ', $fDj, $white, $rDj, $sf)
    $g.DrawString('WILMER', $fName, $shadow, (New-Object System.Drawing.RectangleF([single]($rName.X + $off), [single]($rName.Y + $off), [single]$rName.Width, [single]$rName.Height)), $sf)
    $g.DrawString('WILMER', $fName, $white, $rName, $sf)
    $g.DrawString('RADIO 24/7', $fSub, $white, $rSub, $sf)

    $fDj.Dispose(); $fName.Dispose(); $fSub.Dispose(); $white.Dispose(); $shadow.Dispose(); $sf.Dispose()
  } else {
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $font = New-Object System.Drawing.Font('Arial Black', [single]($labelR * 0.66), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $rect = New-Object System.Drawing.RectangleF([single]($cx - $labelR), [single]($cy - $labelR * 0.62), [single]($labelR * 2), [single]($labelR * 1.2))
    $g.DrawString('DW', $font, $white, $rect, $sf)
    $font.Dispose(); $white.Dispose(); $sf.Dispose()
  }
}

function Save-Square([int]$size, [string]$path, [bool]$maskable = $false, [bool]$withText = $false) {
  $pair = New-Graphics $size
  $bmp = $pair[0]; $g = $pair[1]

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,
    [System.Drawing.Color]::FromArgb(255, 20, 8, 8),
    [System.Drawing.Color]::FromArgb(255, 7, 4, 5),
    45.0)
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  # Resplandor cálido
  $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
  $glowPath.AddEllipse([single](-$size * 0.25), [single]($size * 0.35), [single]($size * 1.2), [single]($size * 1.2))
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
  $glow.CenterColor = [System.Drawing.Color]::FromArgb(110, 255, 69, 0)
  $glow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 69, 0))
  $g.FillPath($glow, $glowPath)
  $glow.Dispose(); $glowPath.Dispose()

  $scale = if ($maskable) { 0.76 } else { 0.94 }
  Draw-Vinyl $g $size $withText $scale

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

# Logo principal (cuadrado, se recorta en círculo en la interfaz)
Save-Square 1024 (Join-Path $imgDir 'logo-1024.png') $false $true

# Iconos PWA
Save-Square 192 (Join-Path $iconDir 'icon-192.png') $false $false
Save-Square 512 (Join-Path $iconDir 'icon-512.png') $false $false
Save-Square 512 (Join-Path $iconDir 'maskable-512.png') $true $false

# Apple touch icon (180)
$src = [System.Drawing.Image]::FromFile((Join-Path $iconDir 'icon-512.png'))
$bmp180 = New-Object System.Drawing.Bitmap(180, 180)
$g180 = [System.Drawing.Graphics]::FromImage($bmp180)
$g180.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g180.DrawImage($src, 0, 0, 180, 180)
$bmp180.Save((Join-Path $iconDir 'apple-touch-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g180.Dispose(); $bmp180.Dispose(); $src.Dispose()

Write-Host 'Iconos generados correctamente.'

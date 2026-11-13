param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$Output,
  [string]$Background = "#F5F5F5"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$outputPath = [System.IO.Path]::GetFullPath($Output)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null

$backgroundColor = [System.Drawing.ColorTranslator]::FromHtml($Background)
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

function New-MsixImage {
  param(
    [int]$Width,
    [int]$Height,
    [bool]$Fit,
    [double]$PaddingRatio,
    [string]$Name
  )

  $bitmap = New-Object System.Drawing.Bitmap -ArgumentList $Width, $Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.Clear($backgroundColor)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($Fit) {
      $padding = [Math]::Round([Math]::Min($Width, $Height) * $PaddingRatio)
      $availableWidth = [Math]::Max(1, $Width - ($padding * 2))
      $availableHeight = [Math]::Max(1, $Height - ($padding * 2))
      $scale = [Math]::Min(
        $availableWidth / $sourceImage.Width,
        $availableHeight / $sourceImage.Height
      )
      $drawWidth = [Math]::Max(1, [int][Math]::Round($sourceImage.Width * $scale))
      $drawHeight = [Math]::Max(1, [int][Math]::Round($sourceImage.Height * $scale))
      $x = [int][Math]::Round(($Width - $drawWidth) / 2)
      $y = [int][Math]::Round(($Height - $drawHeight) / 2)
      $graphics.DrawImage($sourceImage, $x, $y, $drawWidth, $drawHeight)
    } else {
      $graphics.DrawImage($sourceImage, 0, 0, $Width, $Height)
    }
  } finally {
    $graphics.Dispose()
  }

  $target = Join-Path $outputPath $Name
  $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()

  Write-Output ("{0} ({1}x{2})" -f $Name, $Width, $Height)
}

try {
  # Required package logos.
  New-MsixImage -Width 50 -Height 50 -Fit $false -PaddingRatio 0 -Name "StoreLogo.png"
  New-MsixImage -Width 44 -Height 44 -Fit $false -PaddingRatio 0 -Name "Square44x44Logo.png"
  New-MsixImage -Width 150 -Height 150 -Fit $false -PaddingRatio 0 -Name "Square150x150Logo.png"

  # Optional tiles and splash screen.
  New-MsixImage -Width 310 -Height 310 -Fit $false -PaddingRatio 0 -Name "Square310x310Logo.png"
  New-MsixImage -Width 310 -Height 150 -Fit $true -PaddingRatio 0.10 -Name "Wide310x150Logo.png"
  New-MsixImage -Width 620 -Height 300 -Fit $true -PaddingRatio 0.12 -Name "SplashScreen.png"
  New-MsixImage -Width 24 -Height 24 -Fit $false -PaddingRatio 0 -Name "LockScreenLogo.png"

  # Extra sizes used by the Windows shell for the small square logo.
  New-MsixImage -Width 16 -Height 16 -Fit $false -PaddingRatio 0 -Name "Square44x44Logo.targetsize-16.png"
  New-MsixImage -Width 24 -Height 24 -Fit $false -PaddingRatio 0 -Name "Square44x44Logo.targetsize-24.png"
  New-MsixImage -Width 32 -Height 32 -Fit $false -PaddingRatio 0 -Name "Square44x44Logo.targetsize-32.png"
  New-MsixImage -Width 48 -Height 48 -Fit $false -PaddingRatio 0 -Name "Square44x44Logo.targetsize-48.png"
  New-MsixImage -Width 256 -Height 256 -Fit $false -PaddingRatio 0 -Name "Square44x44Logo.targetsize-256.png"
} finally {
  $sourceImage.Dispose()
}

#requires -Version 5.1
param([string]$ProjectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $ProjectPath -PathType Container)) { throw 'No existe carpeta de proyecto.' }
Set-Location -LiteralPath $ProjectPath
if (-not (Test-Path -LiteralPath 'package-lock.json')) { throw 'package-lock.json faltante' }
if (-not (Test-Path -LiteralPath '.env.example')) { throw '.env.example faltante' }
$capturas = @('dashboard','activos','empleados','asignaciones','mantenimiento')
foreach ($item in $capturas) {
 $f = Join-Path 'docs/screenshots' ("dactivos-$item.png")
 if (-not (Test-Path -LiteralPath $f -PathType Leaf)) { throw "Falta captura: $f" }
}
Write-Host 'DACTIVOS | Cinco capturas y configuracion ejemplo presentes' -ForegroundColor Cyan
$steps = @(
 @{label='npm ci'; args=@('ci')},
 @{label='TypeScript'; args=@('run','typecheck')},
 @{label='ESLint'; args=@('run','lint')},
 @{label='Node tests'; args=@('test')},
 @{label='Next production build'; args=@('run','build')},
 @{label='Production dependencies audit'; args=@('audit','--omit=dev','--audit-level=high')}
)
foreach ($step in $steps) {
 Write-Host ("`n==> " + $step.label) -ForegroundColor Cyan
 $commandArgs = [string[]] $step.args
 & npm.cmd @commandArgs
 if ($LASTEXITCODE -ne 0) { throw ("Fallo: " + $step.label + ", codigo " + $LASTEXITCODE) }
}
Write-Host 'Validaciones locales realizadas. Aun falta la instalacion limpia de la base de datos.' -ForegroundColor Green

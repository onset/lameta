# Runs src/model/Project/ScalingMeasure.manual.spec.ts with the CPU capped, so that the times
# look like those of an old laptop. The cap is a Windows Job Object CPU rate limit.
#
#   .\scripts\measure-scaling-throttled.ps1 -Dirs "D:\perf-projects\elar-10;D:\perf-projects\elar-1000" -Out C:\temp\scaling.json
#
# Measure one large project per run: each run holds its projects in one vitest worker.
param(
  [Parameter(Mandatory = $true)][string]$Dirs,
  [Parameter(Mandatory = $true)][string]$Out,
  # how many times slower than one of this machine's processors the measurement should run
  [double]$Slowdown = 4
)
# never measure without the cap
$ErrorActionPreference = "Stop"

# The cap goes on this script's own process, so that every process it starts inherits it.
# Run in a new pwsh, so that the cap does not stay on the shell that called this.
if (-not $env:LAMETA_SCALING_IN_JOB) {
  $env:LAMETA_SCALING_IN_JOB = "1"
  try {
    pwsh -NoProfile -File $PSCommandPath -Dirs $Dirs -Out $Out -Slowdown $Slowdown
  } finally {
    Remove-Item Env:LAMETA_SCALING_IN_JOB
  }
  exit $LASTEXITCODE
}
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ScalingJob {
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateJobObject(IntPtr a, string n);
  [DllImport("kernel32.dll")] public static extern bool SetInformationJobObject(IntPtr j, int c, ref CpuRateInformation i, int l);
  [DllImport("kernel32.dll")] public static extern bool AssignProcessToJobObject(IntPtr j, IntPtr p);
  [StructLayout(LayoutKind.Sequential)] public struct CpuRateInformation { public uint ControlFlags; public uint CpuRate; }
}
"@
$job = [ScalingJob]::CreateJobObject([IntPtr]::Zero, $null)
$info = New-Object ScalingJob+CpuRateInformation
# JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP; the rate is in 1/100 of a percent of the machine
$info.ControlFlags = 0x1 -bor 0x4
# The rate is a share of the whole machine, and the measurement runs on one processor, so
# 1/Slowdown of one processor is 1/(processors × Slowdown) of the machine.
$info.CpuRate = [uint32][Math]::Max(1, 10000 / ([Environment]::ProcessorCount * $Slowdown))
# 15 is JobObjectCpuRateControlInformation
if (-not [ScalingJob]::SetInformationJobObject($job, 15, [ref]$info, 8)) { throw "SetInformationJobObject failed" }
if (-not [ScalingJob]::AssignProcessToJobObject($job, [Diagnostics.Process]::GetCurrentProcess().Handle)) {
  throw "AssignProcessToJobObject failed"
}

$env:LAMETA_SCALING_DIRS = $Dirs
$env:LAMETA_SCALING_OUT = $Out
$env:LAMETA_SCALING_PROGRESS = "$Out.progress"
# lets the spec collect the first opening before it measures the heap of the second
$env:NODE_OPTIONS = "--expose-gc"
$log = "$Out.log"
$repo = Split-Path -Parent $PSScriptRoot
$p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c vp test run src/model/Project/ScalingMeasure.manual.spec.ts --maxWorkers=1 > `"$log`" 2>&1" -WorkingDirectory $repo -PassThru -WindowStyle Hidden
$p.WaitForExit()
Select-String -Path $log -Pattern 'Tests |Error' | ForEach-Object { $_.Line }

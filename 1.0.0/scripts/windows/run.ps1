param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Remaining)
& node (Join-Path $PSScriptRoot '../core/cli.mjs') @Remaining
exit $LASTEXITCODE

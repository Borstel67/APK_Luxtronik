# Luxtronik Prüfskript – NUR LESEN (kein SET/SAVE)
# Vergleicht WebSocket-Schnittstelle (Port 8214, wie die App) mit der Java-Schnittstelle (Port 8889, wie java.html/wp.jar)
param([string]$IP = "192.168.178.120", [string]$Pass = "999999")
$ErrorActionPreference = "Stop"
$out = Join-Path $PSScriptRoot "lux_check_result.txt"
$log = New-Object System.Collections.Generic.List[string]
function L($s){ $log.Add([string]$s); Write-Host $s }

# ---------- Teil 1: WebSocket 8214 ----------
L "===== WEBSOCKET ws://$IP`:8214 (Lux_WS) ====="
try {
  $ws = New-Object System.Net.WebSockets.ClientWebSocket
  $ws.Options.AddSubProtocol("Lux_WS")
  $ct = [Threading.CancellationToken]::None
  $ws.ConnectAsync([Uri]"ws://$IP`:8214", $ct).Wait(8000) | Out-Null
  function WsSend($t){ $b=[Text.Encoding]::UTF8.GetBytes($t); $ws.SendAsync((New-Object ArraySegment[byte] -ArgumentList (,$b)), 'Text', $true, $ct).Wait() }
  function WsRecv(){
    $ms = New-Object IO.MemoryStream; $buf = New-Object byte[] 65536
    do {
      $task = $ws.ReceiveAsync((New-Object ArraySegment[byte] -ArgumentList (,$buf)), $ct)
      if (-not $task.Wait(8000)) { return $null }
      $ms.Write($buf, 0, $task.Result.Count)
    } while (-not $task.Result.EndOfMessage)
    [Text.Encoding]::UTF8.GetString($ms.ToArray())
  }
  WsSend "LOGIN;$Pass"
  $nav = WsRecv
  L "--- NAVIGATION ---"; L $nav
  $ids = [regex]::Matches($nav, '<item id=["'']([^"'']+)["'']>\s*<name>([^<]+)</name>')
  foreach ($m in $ids) {
    $id = $m.Groups[1].Value; $name = $m.Groups[2].Value
    # nur Blattknoten abfragen (kein direkt folgendes <item>)
    $after = $nav.Substring($m.Index + $m.Length)
    if ($after -match "^\s*<item") { continue }
    WsSend "GET;$id"
    $c = WsRecv
    L "--- GET $id ($name) ---"; L $c
  }
  $ws.Dispose()
} catch { L "WebSocket-Fehler: $_" }

# ---------- Teil 2: Java-Protokoll (wp.jar nutzt Port 8888, neuere Firmware 8889) ----------
foreach ($JPort in 8888, 8889) {
L ""; L "===== JAVA-SCHNITTSTELLE tcp://$IP`:$JPort ====="
function Read-Int($r){ $b = $r.ReadBytes(4); [Array]::Reverse($b); [BitConverter]::ToInt32($b, 0) }
function Write-Int($w, [int]$v){ $b = [BitConverter]::GetBytes($v); [Array]::Reverse($b); $w.Write($b) }
try {
  $tcp = New-Object Net.Sockets.TcpClient; $tcp.Connect($IP, $JPort); $tcp.ReceiveTimeout = 8000
  $s = $tcp.GetStream(); $r = New-Object IO.BinaryReader($s); $w = New-Object IO.BinaryWriter($s)
  # 3003 = Parameter (Einstellwerte) – nur lesen
  Write-Int $w 3003; Write-Int $w 0; $w.Flush()
  $pcmd = Read-Int $r; $plen = Read-Int $r
  $params = @(); for ($i=0; $i -lt $plen; $i++) { $params += (Read-Int $r) }
  L "3003: cmd=$pcmd anzahl=$plen"
  L "--- Alle Parameter 3003 ---"; L (($params | ForEach-Object -Begin {$i=0} -Process { "$i=$_"; $i++ }) -join "; ")
  # 3004 = Berechnungen (Ist-Werte)
  Write-Int $w 3004; Write-Int $w 0; $w.Flush()
  $cmd = Read-Int $r; $stat = Read-Int $r; $len = Read-Int $r
  $calc = @(); for ($i=0; $i -lt $len; $i++) { $calc += (Read-Int $r) }
  L "3004: cmd=$cmd status=$stat anzahl=$len"
  $known = [ordered]@{
    "10"="Vorlauf (°C)"; "189"="Vorlauf Soll (°C)"; "11"="Rücklauf (°C)"; "12"="Rückl.-Soll (°C)"; "13"="Rückl.-Extern (°C)"; "14"="Heißgas (°C)";
    "15"="Außentemperatur (°C)"; "16"="Mitteltemperatur (°C)"; "17"="Warmwasser-Ist (°C)"; "18"="Warmwasser-Soll (°C)";
    "19"="Wärmequelle-Ein (°C)"; "20"="Wärmequelle-Aus (°C)"; "21"="Mischkreis1-Vorlauf (°C)"; "22"="Mischkreis1-Soll (°C)"
  }
  L "--- Temperaturen (Rohwert/10) ---"
  foreach ($k in $known.Keys) { $i = [int]$k; if ($i -lt $calc.Count) { L ("{0,3}  {1,-26} {2,7:N1}" -f $i, $known[$k], ($calc[$i] / 10.0)) } }
  L "--- Weitere Rohwerte ---"
  foreach ($k in 80,81,100,117,119,151,154,155,257) { if ($k -lt $calc.Count) { L ("{0,3}  raw={1}" -f $k, $calc[$k]) } }
  L "--- Alle Rohwerte 3004 ---"; L (($calc | ForEach-Object -Begin {$i=0} -Process { "$i=$_"; $i++ }) -join "; ")
  # 3005 = Sichtbarkeiten (Bytes) – bestimmt, welche Werte die Anlage anzeigt
  Write-Int $w 3005; Write-Int $w 0; $w.Flush()
  $vcmd = Read-Int $r; $vlen = Read-Int $r
  $visi = @(); if ($vcmd -eq 3005) { for ($i=0; $i -lt $vlen; $i++) { $visi += [int]$r.ReadByte() } }
  L "3005: cmd=$vcmd anzahl=$vlen"
  L "--- Alle Sichtbarkeiten 3005 ---"; L (($visi | ForEach-Object -Begin {$i=0} -Process { "$i=$_"; $i++ }) -join "; ")
  $json = '{"port":' + $JPort + ',"params":[' + ($params -join ',') + '],"calc":[' + ($calc -join ',') + '],"visi":[' + ($visi -join ',') + ']}'
  Set-Content -Path (Join-Path $PSScriptRoot "lux_java.json") -Value $json -Encoding ASCII
  $tcp.Close()
  break
} catch { L "TCP-$JPort-Fehler: $_" }
}

$log | Set-Content -Path $out -Encoding UTF8
L ""; L "Ergebnis gespeichert: $out"

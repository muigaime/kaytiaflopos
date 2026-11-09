// Reads the text in a photo or scan, using the text recognition built into Windows. Nothing leaves this computer.
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SCRIPT = String.raw`$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$as=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${"`"}1'}|Select-Object -First 1
function Aw($op,$t){$n=$as.MakeGenericMethod($t);$k=$n.Invoke($null,@($op));[void]$k.Wait(-1);$k.Result}
[void][Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
[void][Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics,ContentType=WindowsRuntime]
[void][Windows.Storage.Streams.IRandomAccessStream,Windows.Storage.Streams,ContentType=WindowsRuntime]
$e=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if($e -eq $null){[Console]::Out.Write('NOLANG');exit 0}
$f=Aw ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:KF_IMG)) ([Windows.Storage.StorageFile])
$s=Aw ($f.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$d=Aw ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($s)) ([Windows.Graphics.Imaging.BitmapDecoder])
$b=Aw ($d.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$r=Aw ($e.RecognizeAsync($b)) ([Windows.Media.Ocr.OcrResult])
$o=@(foreach($l in $r.Lines){foreach($w in $l.Words){@{t=$w.Text;x=[int]$w.BoundingRect.X;y=[int]$w.BoundingRect.Y;h=[int]$w.BoundingRect.Height}}})
[Console]::Out.Write((ConvertTo-Json -Compress -InputObject $o))`;

type Word = { t: string; x: number; y: number; h: number };
/** Words on the same level are one line, even when wide gaps split the columns. */
export function wordsToLines(words: Word[]) {
  const rows: { y: number; h: number; w: Word[] }[] = [];
  [...words]
    .sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2))
    .forEach(w => {
      const mid = w.y + w.h / 2,
        row = rows.find(r => Math.abs(r.y - mid) < Math.max(r.h, w.h) * 0.6);
      if (row) row.w.push(w);
      else rows.push({ y: mid, h: w.h, w: [w] });
    });
  return rows.map(r =>
    r.w
      .sort((a, b) => a.x - b.x)
      .map(w => w.t)
      .join(" ")
  );
}

export function readImage(
  base64: string
): Promise<{ status: number; json: Record<string, unknown> }> {
  const buf = Buffer.from(base64, "base64"),
    sig = buf.subarray(0, 4).toString("hex"),
    known =
      sig.startsWith("ffd8") ||
      sig === "89504e47" ||
      sig.startsWith("424d") ||
      ["49492a00", "4d4d002a"].includes(sig);
  if (!known)
    return Promise.resolve({
      status: 400,
      json: { error: "Use a JPG, PNG, BMP or TIFF picture." }
    });
  const file = path.join(os.tmpdir(), `kaytia-scan-${crypto.randomUUID()}`);
  fs.writeFileSync(file, buf);
  return new Promise(ok => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", SCRIPT],
      {
        env: { ...process.env, KF_IMG: file },
        timeout: 90000,
        maxBuffer: 16 * 1048576,
        windowsHide: true
      },
      (err, out) => {
        fs.rmSync(file, { force: true });
        if (err) return ok({ status: 502, json: { error: "That picture couldn't be read." } });
        if (out === "NOLANG")
          return ok({
            status: 503,
            json: { error: "Windows has no text recognition language installed." }
          });
        try {
          const W = JSON.parse(out || "[]") as Word[];
          ok({ status: 200, json: { lines: wordsToLines(W) } });
        } catch {
          ok({ status: 502, json: { error: "That picture couldn't be read." } });
        }
      }
    );
  });
}

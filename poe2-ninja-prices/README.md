# poe2-ninja-prices（価格の公開リポジトリの雛形）

poe.ninja の PoE2 の価格を一定時間ごとに取得して、このリポジトリに JSON として保存します。
PoE2 クラフト工程プランナーは、ここの JSON をブラウザから読み込みます
（poe.ninja の API はブラウザから直接読めないため。raw.githubusercontent.com は読めます）。

## 作り方

1. GitHub で**公開（Public）**リポジトリを作ります（例：`nucyan/poe2-ninja-prices`）。
2. このフォルダーの中身（`update-prices.mjs`、`.github/workflows/update-prices.yml`、この README）を、そのリポジトリの直下にコピーしてプッシュします。
3. リポジトリの Settings → Actions → General → Workflow permissions を「Read and write permissions」にします（価格をコミットするため）。
4. Actions タブで `update-prices` を選び、「Run workflow」で1回実行します。`poe2/leagues.json` と `poe2/<リーグ>.json` ができれば完了です。以後は2時間ごとに自動で更新されます。
5. プランナーの「1. データ」→「価格（poe.ninja）」の取得元に、`https://raw.githubusercontent.com/<所有者>/<リポジトリ>/main/poe2/` を入れます
   （`nucyan/poe2-ninja-prices` で作った場合は初期値のままで使えます）。

## 出力

- `poe2/leagues.json`：取得したリーグの一覧（ID・名前・ファイル名・品目数）と取得日時
- `poe2/<リーグ>.json`：リーグの全品目の価格。`items[<poe.ninja の品目 ID>] = { name, value, type }`。`value` は Divine Orb 建て（poe.ninja の primaryValue）。`rates` は 1 Divine あたりの Exalted / Chaos の数

## 注意

- poe.ninja の API の利用条件（https://poe.ninja/docs/api）に従い、識別できる User-Agent を送り、リクエストの間隔を空けています。実行間隔を短くしすぎないでください。
- 取引の少ない品目（レッサーエッセンスなど）は poe.ninja に価格がありません。プランナーでは、価格がない品目を手入力できます。
- GitHub Actions の定期実行は、リポジトリに60日間動きがないと止まることがあります（価格のコミットが続いていれば止まりません）。

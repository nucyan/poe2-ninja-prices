# poe2-ninja-prices

[poe.ninja](https://poe.ninja/poe2/economy) の Path of Exile 2 の価格を **1時間ごと** に取得し、JSON として公開しているリポジトリです。
PoE2 クラフト工程プランナー（クラフトに必要なカレンシーの期待消費を計算するツール）が、このファイルを価格データとして読み込みます。

poe.ninja の API はブラウザから直接読み込めない（CORS ヘッダーがない）ため、GitHub Actions で定期的に取得して静的ファイルにしています。
`raw.githubusercontent.com` のファイルはブラウザから読み込めます（`Access-Control-Allow-Origin: *`）。

> 非公式のデータです。poe.ninja・Grinding Gear Games とは関係ありません。価格は poe.ninja の値をそのまま保存したもので、正確さは保証しません。

## 使い方

ブラウザやスクリプトから、次の URL を読み込んでください。

```
https://raw.githubusercontent.com/nucyan/poe2-ninja-prices/main/poe2/leagues.json
https://raw.githubusercontent.com/nucyan/poe2-ninja-prices/main/poe2/<ファイル名>.json
```

1. `leagues.json` でリーグの一覧とファイル名を確認します。
2. 使うリーグのファイル（例：`forbidden-rites.json`）を読み込みます。

```js
const base = 'https://raw.githubusercontent.com/nucyan/poe2-ninja-prices/main/poe2/';
const index = await (await fetch(base + 'leagues.json')).json();
const league = index.leagues.find((l) => l.id === 'Forbidden Rites');
const prices = await (await fetch(base + league.file)).json();
console.log(prices.items['exalted'].value);                        // Exalted Orb の価格（Divine Orb 建て）
console.log(prices.items['exalted'].value * prices.rates.exalted); // Exalted Orb 建てにすると約 1
```

## ファイルの形式

### `poe2/leagues.json`

```json
{
  "format": "poe2-ninja-price-index",
  "formatVersion": 1,
  "fetchedAt": "2026-10-21T09:39:27.010Z",
  "leagues": [
    { "id": "Forbidden Rites", "name": "Forbidden Rites", "file": "forbidden-rites.json", "items": 511, "failed": 0 }
  ]
}
```

| 項目 | 内容 |
|---|---|
| `fetchedAt` | 取得日時（UTC） |
| `leagues[].id` / `name` | poe.ninja のリーグ ID と名前 |
| `leagues[].file` | そのリーグの価格ファイルの名前 |
| `leagues[].items` | 価格のある品目の数 |
| `leagues[].failed` | 取得に失敗したカテゴリの数（通常は 0） |

### `poe2/<リーグ>.json`

```json
{
  "format": "poe2-ninja-prices",
  "formatVersion": 1,
  "league": "Forbidden Rites",
  "fetchedAt": "2026-10-21T09:39:27.010Z",
  "baseCurrency": "divine",
  "rates": { "exalted": 694.3, "chaos": 9.66 },
  "source": "https://poe.ninja/poe2/economy",
  "failed": [],
  "items": {
    "exalted": { "name": "Exalted Orb", "value": 0.00144, "type": "Currency" }
  }
}
```

| 項目 | 内容 |
|---|---|
| `items` | 品目ごとの価格。キーは poe.ninja の品目 ID（例：`exalted`、`perfect-chaos-orb`、`omen-of-whittling`） |
| `items[].name` | 英語名 |
| `items[].value` | 価格（`baseCurrency` 建て。poe.ninja の `primaryValue`） |
| `items[].type` | poe.ninja のカテゴリ（下記） |
| `baseCurrency` | 価格の基準通貨（現在は `divine`） |
| `rates` | 基準通貨 1 個あたりの Exalted Orb・Chaos Orb の数（他の通貨建てへの換算に使う） |
| `failed` | 取得に失敗したカテゴリと理由（通常は空） |

取得しているカテゴリ（poe.ninja の exchange の type）：
`Currency`、`Fragments`、`Abyss`、`Essences`、`SoulCores`、`Idols`、`Runes`、`Ritual`（お告げ）、`Expedition`、`Delirium`、`Breach`（カタリスト）、`Verisium`（合金）

## 更新

- GitHub Actions（`.github/workflows/update-prices.yml`）が **毎時17分** に実行し、価格が変わっていればコミットします。GitHub の混み具合により、数分遅れることがあります。
- poe.ninja の PoE2 の価格は約1時間ごとに更新されます。
- 取引の少ない品目（一部のエッセンスなど）は poe.ninja に価格がなく、ファイルにも含まれません。リーグによって含まれる品目が違います。

## 自分のリポジトリで動かす場合

1. このリポジトリの `update-prices.mjs` と `.github/workflows/update-prices.yml` を、公開リポジトリにコピーします。
2. Actions タブで `update-prices` を選び、「Run workflow」で1回実行します。`poe2/` に JSON ができれば完了です。
   書き込みに失敗する場合は、Settings → Actions → General → Workflow permissions を「Read and write permissions」にしてください。

手元で実行する場合（Node.js 18 以降、npm パッケージ不要）：

```
node update-prices.mjs --out poe2                                # 全リーグ
node update-prices.mjs --leagues "Forbidden Rites" --out poe2    # 指定したリーグだけ
```

## 利用上の注意

- 価格の出典は [poe.ninja](https://poe.ninja/)（[API の説明](https://poe.ninja/docs/api)）です。利用する場合は出典を明記してください。
- 取得スクリプトは poe.ninja の利用条件に従い、識別できる User-Agent を送り、リクエストの間隔（1.5 秒）を空けています。実行間隔を短くしないでください。
- GitHub Actions の定期実行は、リポジトリに 60 日間動きがないと止まることがあります（価格のコミットが続いていれば止まりません）。

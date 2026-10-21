# Oct21 PHP Risk Inspector

Webサイトの制作・運用・保守に携わる人向けの Chrome 拡張機能です。自社サイトや運用を担当しているサイトをブラウザで開いたときに、次の2点を**簡易的にチェック**できます。対象は、2026-10-21 に公開された PHP のセキュリティアドバイザリ（CVE-2026-109618 / CVE-2026-109619）です。

- サイトが「未修正の可能性があるPHP」で動いていないか（画面右下に、スクロールに追従するマークで表示）
- ページ内に怪しいリンク（IPアドレス、表示テキストとリンク先の不一致、`@` を使った偽装など）が含まれていないか。改ざんによってリンクが差し込まれていないかを確かめる用途を想定しています

> 非公式ツールです。表示は外部から見える情報による推定で、サイトが実際に脆弱かどうかは判定していません。

## 想定する使い方と注意

- **対象:** 自社サイト、クライアントから運用を任されているサイト、開発・検証環境など、**利用者自身が管理・確認する立場にあるサイト**です。
- **これは簡易チェックです:** 正式な確認の代わりにはなりません。
  - レスポンスヘッダのバージョン表記は、サーバーの設定で隠したり、別の値に書き換えたり（偽装）できます。表示が「修正版以降のバージョン」や「PHP非公開、または未使用」でも、安全が保証されるわけではありません。
  - 怪しいリンクの判定は、ルールに基づく機械的なものです。すべての改ざんを見つけられるわけではなく、問題のないリンクがハイライトされることもあります。
  - 実際のPHPバージョンは、サーバー上で `php -v`、`phpinfo()`、パッケージ管理ツールなどで確認してください。
- **第三者のサイトでの表示について:** 第三者のサイトでマークが出ても、そのサイトが危険であるとは限りません。
  - 判定の根拠は、サーバーが公開しているバージョン番号だけです。
  - Linux ディストリビューションが独自に修正を取り込んでいる場合など、番号が古くても対策済みのことがあります。
  - そのため、この拡張機能の表示を、運営者への指摘・問い合わせ・苦情や、SNSなどでの公表の根拠には使わないでください。
- **自社サイトで「未修正の可能性」と出た場合:**
  - まずはサーバー上で実際のPHPバージョンを確認し、修正版（8.5.12 / 8.4.27 / 8.3.36 / 8.2.35）以降に更新してください。
  - あわせて `php.ini` の `expose_php = Off` を設定し、レスポンスヘッダでバージョンを公開しないようにすることも検討してください。

## 判定の仕組み

### PHP バージョンの判定

ページを開いたときにブラウザが受け取るレスポンスヘッダと URL だけを見て判定します。
- 対象はページ本体（トップレベルのドキュメント）だけで、画像やスクリプトなどのレスポンスは見ません。
- 拡張機能からサイトに追加のリクエストやスキャンを送ることはありません。

| 手がかり | 例 | バージョンが分かるか |
|---|---|---|
| `X-Powered-By` ヘッダ | `X-Powered-By: PHP/8.3.10` | 分かる |
| `Server` ヘッダ | `Server: Apache/2.4 (Debian) PHP/8.2.20-1+deb12u5` | 分かる |
| `Set-Cookie` の Cookie 名 | `PHPSESSID=...`（Cookie の値は判定に使わず、保存もしません） | 分からない |
| URL | `/index.php` | 分からない |

見つかったバージョンを、アドバイザリの修正版と比べて表示します。

| 表示 | 色 | 条件 |
|---|---|---|
| 未修正の可能性 | 赤 | 8.2〜8.5 系で、修正版（8.5.12 / 8.4.27 / 8.3.36 / 8.2.35）より古い |
| サポート終了版 | 赤 | 8.1 以下（公式の修正版がない） |
| PHP（バージョン不明） | 黄 | PHP の手がかりはあるが、バージョンが公開されていない |
| PHP 開発版 | 黄 | `RC`・`beta`・`alpha`・`-dev` などを含むバージョン |
| 修正版以降のバージョン | 緑 | 表記上のバージョンが修正版以降、または修正後に公開された新しい系列（安全を保証するものではありません） |
| PHP非公開、または未使用 | グレー＋黄 | 上記の手がかりが見つからない。PHPの情報を公開していないか、PHPを使っていない（下記参照） |

- **「PHP非公開、または未使用」のうち、多くは「非公開」のほう**です。次のような理由で、PHPを使っていても手がかりが見つからないことがよくあります。
  - セキュリティ対策として `expose_php = Off` などでバージョン情報を隠すことが推奨されていて、実際に隠しているサイトも多くあります。レンタルサーバーによっては、初期設定で隠されていることもあります。
  - WordPress のパーマリンクや各種フレームワークでは、URL に `.php` が出ません。
  - セッション Cookie の名前を変えている場合や、ログインするまでセッションを使わないサイトでは、`PHPSESSID` が出てきません。
  - CDN やリバースプロキシを経由すると、ヘッダが削除・上書きされることがあります。
- `8.2.20-1+deb12u5` のようなディストリビューション版も番号で判定します。番号が古くても修正が取り込まれている場合があるため、その旨の注記を表示します。
- ツールバーのアイコンにも、赤 `!`・黄 `?`・緑 `✓` のバッジで状態を表示します。

### 怪しいリンクの判定

ページ内のリンク（`<a href>`）を、次のルールで機械的に判定します。後から追加されたリンクも追跡します。

| ID | ルール | 例 | 重さ | 既定 |
|---|---|---|---|---|
| R1 | IP アドレスの URL（整数表記・16進表記も含む） | `http://192.0.2.1/`、`http://3221225985/` | 高 | ON |
| R2 | 表示テキストと実際のリンク先が違う（短縮 URL には適用しない） | 表示 `paypal.com` → 実体 `evil.example` | 高 | ON |
| R3a | 危険なスキーム | `data:`、`vbscript:` | 高 | ON |
| R3b | `javascript:` リンク（モーダルの開閉などで日常的に使われるため） | `javascript:void(0)` | 中 | **OFF** |
| R4 | `@` を使った偽装 URL | `https://www.google.com@evil.example/` | 高 | ON |
| R5 | 国際化ドメイン（Punycode）への外部リンク | `xn--pple-43d.example` | 中 | ON |
| R6 | 外部ドメイン（ページと登録ドメインが違う） | | 低（未修正・サポート終了のPHPのページでは注意） | ON |
| R7 | 短縮 URL | `bit.ly`、`t.co` など | 注意（未修正・サポート終了のPHPのページでは高） | ON |
| R8 | HTTPS のページから HTTP への移動 | | 中 | ON |

- **見た目:** 高は赤枠、中はオレンジ枠、注意は黄枠、低はグレーの点線の枠です。1つのリンクが複数のルールに当てはまる場合は、最も重いものの見た目になります。リンクにマウスを乗せると、該当したルールと実際のリンク先が表示されます。
- **ページの判定による重さの変化:** ページ自体が「未修正の可能性」または「サポート終了版」（赤）と判定された場合は、改ざんで差し込まれたリンクを確認しやすくするため、外部ドメイン（R6）は「注意」、短縮 URL（R7）は「高」に上がります。
- **短縮 URL（R7）の重さ:**
  - X などの SNS では、貼り付けた URL が自動で短縮 URL に置き換えられることが多いので、通常は「注意」（黄）です。
  - 赤のページでは「高」になります（上記）。
  - 短縮 URL は実際のリンク先が見えず、表示テキストと一致しないのが普通なので、R2 は適用しません。
- **R2 の判定方法:**
  - テキストの中に `http://` か `https://` で始まる URL があれば、それを取り出してリンク先と比べます。前後に別の文字があっても構いません。
  - `http://` のないドメイン（`paypal.com` など）は、テキスト全体がドメインのときだけ比べます。「report.pdf」のようなファイル名などをドメインと誤って判定しないためです。
  - サブドメインの違いは無視して、登録ドメイン単位で比べます（`www.example.com` と `shop.example.com` は同じ扱い）。
- **判定しないもの:** 同じサイト内のリンク、ページ内リンク（`#...`）、`mailto:`、`tel:` は対象外です。
- **登録ドメインの判定:** `example.co.jp` のような判定には、Public Suffix List（同梱の [tldts](https://github.com/remusao/tldts)）を使います。
- **設定:** 各ルールは設定画面で個別に ON/OFF できます。ハイライトする範囲を「PHP の警告が出ているサイトだけ」に絞ることもできます。

### データの扱い

判定はすべてブラウザの中で行い、拡張機能から外部への通信はしません。保存する情報や、閲覧中のページに追加する要素については [PRIVACY.md](PRIVACY.md) を参照してください。

## 必要なもの

- Google Chrome 120 以降
- Node.js 22 以降（テストと補助スクリプト用。拡張機能そのものの動作には不要）

## セットアップ

```sh
npm install        # 型チェック用の開発ツールだけをインストール（拡張機能本体は依存なし）
```

## Chrome に読み込む

1. `chrome://extensions` を開く
2. 右上の「デベロッパー モード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリックし、このリポジトリの **`extension-src/` フォルダ**を選ぶ
4. コードを変更したら、拡張機能カードの再読み込みボタン（↻）を押し、確認したいページも再読み込みする

## 動作確認

```sh
npm run serve      # http://localhost:8787/ を開く
```

PHPをインストールしなくても、テスト用のヘッダ（`X-Powered-By: PHP/8.3.10` など）を返すページを確認できます。各ページの下部には、全ルールに該当するリンクのサンプル（[develop/test/site/links.html](develop/test/site/links.html)）が入っています。

| URL | 期待する表示 |
|---|---|
| `/php/8.3.10` | 赤「未修正の可能性」 |
| `/php/8.4.27` | 緑「修正版以降のバージョン」 |
| `/php/7.4.33` | 赤「サポート終了版」 |
| `/php/8.6.0RC3` | 黄「PHP 開発版」 |
| `/server/8.2.20-1+deb12u5` | 赤 + ディストリ版の注記 |
| `/cookie`, `/index.php` | 黄「バージョン不明」 |
| `/plain` | グレー + 黄色の点「PHP非公開、または未使用」 |

## コマンド

| コマンド | 内容 |
|---|---|
| `npm test` | ユニットテスト（Node 標準の `node --test`） |
| `npm run typecheck` | JSDoc の型チェック |
| `npm run serve` | 動作確認用のローカルサーバー |
| `npm run icons` | アイコン PNG の再生成 |
| `npm run zip` | 配布用の zip（Chrome Web Store などへの提出にも使える形式）を `dist/` に作成 |

## ディレクトリ構成

```
extension-src/    拡張機能本体（Chrome に読み込ませる / 配布するのはここだけ）
  lib/              判定ロジック（純粋関数・テスト対象）
  background/       Service Worker（ヘッダ監視）
  content/          バッジ表示・リンクのハイライト
  popup/            ツールバーのポップアップ
  options/          設定画面
  _locales/         日本語・英語の文言
  vendor/           同梱ライブラリ
  icons/            アイコン
develop/          開発用（拡張機能には含まれない）
  test/unit/        ユニットテスト
  test/site/        手動確認用のテストサイト（ページとサーバー）
  scripts/          アイコン生成・zip 作成
  types/            型定義（エディタ用）
```

`package.json`、`package-lock.json`、`jsconfig.json` は、npm や VSCode がルートにあることを前提にしているため、`develop/` ではなくルートに置いています。


## 同梱ライブラリ

| ライブラリ | バージョン | 用途 | ライセンス | 取得元 |
|---|---|---|---|---|
| [tldts](https://github.com/remusao/tldts) | 7.4.16 | 登録ドメイン（eTLD+1）の判定 | MIT（[extension-src/vendor/tldts.LICENSE.txt](extension-src/vendor/tldts.LICENSE.txt)） | npm `tldts@7.4.16` の `dist/index.umd.min.js`（sourceMappingURL 行のみ削除） |

Public Suffix List はこのファイルに含まれています。作者がライブラリを更新するときは、新しいバージョンの同じファイルで置き換え、上の表を更新します。

## 制作について

このツールは、作者が Anthropic の AI コーディングアシスタント「[Claude Code](https://claude.com/claude-code)」を併用して制作しています。コードとドキュメントの多くは Claude Code が作成しました。仕様の決定、内容の確認、公開の判断は作者が行っています。

## Issue と Pull Request について

- **要望・不具合の報告:** GitHub の [Issues](../../issues) で受け付けています。対応するかどうかや時期は作者が判断します。対応をお約束するものではありません。
- **Pull Request:** 受け付けていません。届いた場合も、取り込まずにクローズすることがあります。改善の提案は Issue でお知らせください。
- **自分用の改変:** クローンや Fork をして改変するのは自由です（MIT ライセンス）。ただし、改変版について作者は責任を負わず、サポートもしません。

詳しくは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## ライセンス

[MIT License](LICENSE) です。改変・再配布・自作のツールへの組み込みは自由に行えます。

- 本ソフトウェアは無保証です。利用によって生じたいかなる損害についても、作者は責任を負いません。
- 改変版を公開する場合は、オリジナルと誤認されないよう、**別の名前とアイコン**を使ってください。改変版を Chrome Web Store などで配布する場合は、追加した機能と、データの取り扱いを利用者に明示してください。
- 改変版について、作者は責任を負わず、サポートもしません。
- 同梱している [tldts](https://github.com/remusao/tldts) は、それ自身の MIT ライセンス（[extension-src/vendor/tldts.LICENSE.txt](extension-src/vendor/tldts.LICENSE.txt)）に従います。
- 本ツールは非公式のもので、The PHP Group とは関係ありません。

## English summary

An unofficial Chrome extension for people who build and operate websites. When you open your own sites, or sites you are responsible for, it performs a quick, best-effort check for two things: whether they may run a PHP version affected by the PHP security advisory of 2026-10-21, and whether they contain suspicious links. It is not a substitute for checking the server itself: version headers can be hidden or spoofed, and link rules are heuristic. A warning on a third-party site does not mean that site is unsafe, so please do not use this extension's output as grounds for complaints or public accusations. Released under the [MIT License](LICENSE). If you publish a modified version, please use a different name and icon so it is not mistaken for this one. This project was built with the help of Anthropic's AI coding assistant, Claude Code; the author decided the specification and reviewed the result. Feature requests and bug reports are welcome via GitHub Issues, but pull requests are not accepted. Modified versions are not supported, and the author accepts no responsibility for them.

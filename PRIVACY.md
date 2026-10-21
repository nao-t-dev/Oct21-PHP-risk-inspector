# プライバシーポリシー / Privacy Policy

最終更新: 2026-10-22

## 日本語

Oct21 PHP Risk Inspector（以下「本拡張機能」）は、利用者の個人情報や閲覧データを収集しません。また、外部に送信することもありません。

- **外部への通信:** 本拡張機能のプログラムは、どのサーバーとも通信しません。解析・トラッキング・広告の仕組みもありません。
  - 表示パネル内の、公式アドバイザリなどへのリンクを利用者がクリックした場合は、通常のリンクと同じようにそのページが開きます。
- **端末の中だけで扱う情報:**
  - **開いたページ本体のレスポンスヘッダ:**
    - PHP の判定に使うのは、`X-Powered-By` と `Server` の値、`Set-Cookie` の Cookie 名（`PHPSESSID` かどうか）だけです。
    - Chrome の仕組み上、ほかのヘッダや Cookie の値も本拡張機能に渡されますが、判定以外には使わず、保存もしません。
  - **開いたページの URL**
  - **ページ内のリンク:** リンク先の URL とリンクテキスト
- **保存する情報:**
  - **設定:**
    - 保存するのは、機能の ON/OFF、「全機能をオフにするサイト」と「マークだけを非表示にするサイト」の一覧です。
    - 保存先は `chrome.storage.sync` です。Chrome の同期機能を有効にしている場合は、利用者の Google アカウントを通じて、利用者自身の端末間で同期されます。
  - **タブごとの判定結果:**
    - 保存するのは、サイトのオリジン（例: `https://example.com`）、判定結果、判定の根拠になったヘッダの値または URL のパスです。
    - 保存先は `chrome.storage.session`（メモリ上の一時領域）です。別のページに移動すると上書きされ、タブを閉じるかブラウザを終了すると削除されます。
    - 閲覧履歴として蓄積することはありません。
- **閲覧中のページへの影響:**
  - ハイライトとマークを表示するため、閲覧中のページに属性（`data-pag-risk` など）と表示用の要素を追加します。
  - そのため、閲覧中のサイトのスクリプトから、本拡張機能を使っていることが分かる場合があります。
- **第三者への提供:** ありません。

## English

Oct21 PHP Risk Inspector ("the extension") does not collect any personal or browsing data, and does not transmit any data to anyone.

- **Network:** The extension's code never contacts any server. It contains no analytics, tracking or advertising.
  - If you click a link in the extension's panel (for example, to the official advisory), that page opens like any other link.
- **Data handled only on your device:**
  - **Response headers of the top-level page:**
    - Only the values of `X-Powered-By` and `Server`, and whether a `Set-Cookie` header sets a cookie named `PHPSESSID`, are used for detection.
    - Because of how Chrome works, other headers and cookie values are also passed to the extension, but they are not used for anything else and are not stored.
  - **The URL of the page**
  - **Links on the page:** link destinations and link text
- **Storage:**
  - **Settings:**
    - Feature toggles, the list of sites where all features are off, and the list of sites where only the badge is hidden.
    - They are saved in `chrome.storage.sync`. If Chrome Sync is enabled, they sync across your own devices through your Google account.
  - **Per-tab results:**
    - The site's origin (e.g. `https://example.com`), the result, and the header value or URL path it was based on.
    - They are kept in `chrome.storage.session` (temporary, in-memory storage). They are overwritten when you navigate to another page and removed when the tab or browser is closed.
    - No browsing history is accumulated.
- **Effect on the pages you visit:**
  - To show highlights and the badge, the extension adds attributes (such as `data-pag-risk`) and a display element to the page.
  - Scripts on that page may therefore be able to tell that the extension is installed.
- **Third parties:** No data is shared with anyone.

## 連絡先 / Contact

GitHub の Issues からご連絡ください / Please contact us via GitHub Issues:
https://github.com/nao-t-dev/Oct21-PHP-risk-inspector/issues

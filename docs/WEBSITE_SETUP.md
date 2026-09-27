# サイトの設定

## Cloudflare Pages

このリポジトリ用にCloudflare Pagesプロジェクトを作り、次のように設定します。

- ビルドコマンド：空欄
- 出力ディレクトリ：`site`
- 本番ブランチ：`main`

サイトはPagesの標準URL（`*.pages.dev`）で公開できます。独自ドメインの設定は不要です。

`functions/` のコードはPages Functionsとしてデプロイされます。Git連携またはWranglerを使ってデプロイしてください。ダッシュボードからのファイル直接アップロードではFunctionsはデプロイされません。

Wranglerから初回デプロイする場合は、プロジェクトを作成してから次を実行します。

```sh
npx wrangler pages project create 524-open-character-project --production-branch main
npx wrangler pages deploy site --project-name 524-open-character-project
```

以後の更新も、リポジトリのルートで2行目のコマンドを実行します。

## microCMS

1. リスト形式のコンテンツAPIを作り、API IDを `works` にします。
2. 次のフィールドを追加します。フィールドIDは記載どおりにしてください。

| フィールドID | 種類 | 必須 |
| --- | --- | --- |
| `title` | テキスト | はい |
| `post_url` | テキスト | はい |
| `creator_name` | テキスト | いいえ |
| `creator_url` | テキスト | いいえ |
| `category` | テキスト | はい |
| `comment` | テキストエリア | いいえ |
| `permission_confirmed` | 真偽値 | はい |

3. APIキーに `works` APIのGETとPOST権限を設定します。HobbyプランはAPIキーが1個なので、GETもPOSTもPages Functions経由にし、キーをブラウザへ渡さないようにします。
4. コンテンツ登録APIの初期状態は非公開のままにしてください。フォームから届いた投稿は下書きで登録され、管理画面で確認して公開します。

## Cloudflare Pagesの環境変数

Pagesプロジェクトの「設定」→「環境変数とシークレット」に次を登録します。

| 名前 | 種類 | 値 |
| --- | --- | --- |
| `MICROCMS_SERVICE_ID` | 環境変数 | microCMSのサービスID（`https://`や`.microcms.io`を除いた部分） |
| `MICROCMS_API_KEY` | シークレット | microCMSのAPIキー |
| `TURNSTILE_SITE_KEY` | 環境変数 | Cloudflare Turnstileのサイトキー |
| `TURNSTILE_SECRET_KEY` | シークレット | Cloudflare Turnstileのシークレットキー |

Turnstileには、本番サイトの`pages.dev`ホスト名を登録します。4項目を設定して再デプロイすると、投稿フォームが有効になります。

## 登録から公開まで

1. 投稿者がX投稿URL、作品の種類、任意の紹介文を入力します。
2. 投稿者本人、または掲載許可を得た人であることを確認して送信します。
3. サイトのFunctionsがURLを検証し、Turnstileを確認してからmicroCMSに下書き登録します。
4. 管理画面で作者・投稿・内容を確認して公開します。

Xの投稿画像はXの埋め込み表示を使います。投稿が削除・非公開化された場合などは、X側の仕様で画像が表示されなくなることがあります。

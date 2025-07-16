# GitHub Issue 自動化スクリプト

このTypeScriptスクリプトは、GitHub ActionsワークフローのIssue自動処理機能を再現します。`ai task`ラベルのIssueを自動的に見つけ、処理対象かどうかを判定し、自動化コメントを投稿します。

## 🎯 機能

- **Issue検索**: 設定可能なラベル（デフォルト: `ai task`）でIssueを検索
- **スマートフィルタリング**: 最新コメントに`@claude`が含まれるIssueや`ai doing`ラベル付きIssue（実行中）をスキップ
- **自動処理**: 対象Issueにコメント投稿とラベル追加を実行
- **詳細ログ**: カラー付きの詳細なコンソール出力
- **エラーハンドリング**: 堅牢なエラー処理と分かりやすいエラーメッセージ
- **設定可能**: 環境変数による柔軟なリポジトリ設定

## 📋 必要な環境

- Node.js 18以上
- npm（Node.jsに含まれる）
- GitHub個人アクセストークン

## 🚀 クイックスタート

### 1. セットアップ

```bash
# スクリプトディレクトリに移動
cd /path/to/scripts/claude-code-automation

# 依存関係をインストール
npm install

# 環境設定
cp .env.example .env
# .envファイルでGitHubトークンと設定を編集
```

### 2. 設定

`.env`ファイルを編集:

```env
# 必須: GitHub個人アクセストークン
GITHUB_TOKEN=ghp_your_token_here

# リポジトリ設定
GITHUB_OWNER=xxx
GITHUB_REPO=xxx

# ラベル設定
TASK_LABEL="ai task"
DOING_LABEL="ai doing"

# 自動化設定
MAX_ISSUES_PER_RUN=10
COMMENT_TEMPLATE="@claude /note-issue-task-run #{{issue_number}}"
```

### 3. 自動化実行

#### ワンショット実行（従来通り）
```bash
# 便利なシェルスクリプトを使用（推奨）
./run.sh

# または手動実行
npm run build
npm run start

# 開発用
npm run dev
```

#### Daemonモード（定期実行）
```bash
# フォアグラウンドでdaemon開始（5分間隔）
./run-daemon.sh

# カスタム間隔で実行（例：10分間隔）
./run-daemon.sh --interval 600

# バックグラウンドで実行
./run-daemon.sh --background

# daemon状態確認
./run-daemon.sh --status

# daemon停止
./run-daemon.sh --stop

# ヘルプ表示
./run-daemon.sh --help
```

## 🔧 設定オプション

| 環境変数 | デフォルト | 説明 |
|---------|----------|------|
| `GITHUB_TOKEN` | 必須 | GitHub個人アクセストークン |
| `GITHUB_OWNER` | `xxx` | リポジトリオーナー |
| `GITHUB_REPO` | `xxx` | リポジトリ名 |
| `TASK_LABEL` | `ai task` | 処理対象Issue識別用ラベル |
| `DOING_LABEL` | `ai doing` | 処理開始時に追加するラベル |
| `MAX_ISSUES_PER_RUN` | `10` | 1回の実行で確認する最大Issue数 |
| `COMMENT_TEMPLATE` | `@claude /note-issue-task-run #{{issue_number}}` | 投稿するコメントテンプレート |
| `DAEMON_MODE` | `false` | Daemonモード有効化（`true`で有効） |
| `DAEMON_INTERVAL` | `300000` | Daemon実行間隔（ミリ秒、デフォルト: 5分） |

## 🔐 GitHubトークンの設定

1. [GitHub設定 > Developer settings > Personal access tokens](https://github.com/settings/tokens)にアクセス
2. "Generate new token (classic)"をクリック
3. 分かりやすい名前を設定: "Issue Automation Script"
4. スコープを選択:
   - **パブリックリポジトリ**の場合: `public_repo`
   - **プライベートリポジトリ**の場合: `repo`（フルスコープ）
5. 生成されたトークンを`.env`ファイルにコピー

## 📊 動作原理

スクリプトはGitHub Actionsワークフローと同じロジックで動作:

### 1. タスクラベルの確認
- 指定されたタスクラベル（デフォルト: `ai task`）でIssueを検索
- Issueが見つからない場合は処理をスキップ

### 2. 対象Issue検索
- タスクラベル付きIssueを取得
- 既に`ai doing`ラベルが付いているIssue（実行中）をスキップ
- 各Issueの最新コメントを確認
- 最新コメントに`@claude`が含まれるIssueをスキップ
- 最初の適格なIssueを選択

### 3. 選択されたIssueの処理
- 設定されたテンプレートでコメントを投稿
- "doing"ラベル（デフォルト: `ai doing`）を追加
- 透明性のため全アクションをログ出力

### 4. サマリー生成
- 実行されたアクションの詳細サマリーを提供
- タイムスタンプとIssue情報を含む
- スキップ/処理済み状態を表示

## 🖥️ 使用例

### 基本的な使用（ワンショット）
```bash
./run.sh
```

### 開発モード
```bash
npm run dev
```

### Daemonモード
```bash
# フォアグラウンドで実行（Ctrl+Cで停止）
./run-daemon.sh

# 30分間隔で実行
./run-daemon.sh --interval 1800

# バックグラウンドで実行
./run-daemon.sh --background

# 状態確認
./run-daemon.sh --status

# 停止
./run-daemon.sh --stop
```

### カスタム設定
```bash
export GITHUB_TOKEN="your-token"
export TASK_LABEL="custom-task"
export DOING_LABEL="in-progress"
export DAEMON_INTERVAL="600000"  # 10分間隔
npm run start --daemon
```

## 📝 出力例

### ワンショット実行
```
ℹ️  [2024-01-15T10:30:00.000Z] [INFO] 🤖 GitHub Issue自動化を開始
ℹ️  [2024-01-15T10:30:00.000Z] [INFO] リポジトリ: xxx/xxx
✅ [2024-01-15T10:30:01.000Z] [SUCCESS] 'ai task'ラベル付きのIssueを3件発見。処理を続行します。
ℹ️  [2024-01-15T10:30:01.000Z] [INFO] Issue #122を確認中: バグ修正
ℹ️  [2024-01-15T10:30:01.000Z] [INFO] ⏭️ Issue #122をスキップ（既に'ai doing'ラベル付き - 実行中）
ℹ️  [2024-01-15T10:30:01.000Z] [INFO] Issue #123を確認中: 新機能の実装
✅ [2024-01-15T10:30:02.000Z] [SUCCESS] Issue #123は対象です（最新コメントに@claudeなしかつ'ai doing'ラベルなし）
✅ [2024-01-15T10:30:03.000Z] [SUCCESS] Issue #123にコメントを投稿しました
✅ [2024-01-15T10:30:04.000Z] [SUCCESS] Issue #123に'ai doing'ラベルを追加しました

## 🤖 Issue自動化サマリー

- 状態: ✅ **処理済み**
- Issue: #123
- タイトル: 新機能の実装
- アクション: 自動化コメントを投稿し、'ai doing'ラベルを追加
- タイムスタンプ: 2024-01-15T10:30:04.000Z
- リポジトリ: xxx/xxx
- スクリプト: claude-code-automation
```

### Daemonモード実行
```
ℹ️  [2024-01-15T10:30:00.000Z] [INFO] Loading configuration...
✅ [2024-01-15T10:30:00.000Z] [SUCCESS] Configuration loaded successfully
ℹ️  [2024-01-15T10:30:00.000Z] [INFO] 🔄 Daemon mode started. Running every 300 seconds
ℹ️  [2024-01-15T10:30:00.000Z] [INFO] Press Ctrl+C to stop gracefully
ℹ️  [2024-01-15T10:30:00.000Z] [INFO] 🤖 GitHub Issue自動化を開始
...（Issue処理ログ）...

ℹ️  [2024-01-15T10:35:00.000Z] [INFO] ⏰ Running scheduled automation check...
ℹ️  [2024-01-15T10:35:00.000Z] [INFO] 🤖 GitHub Issue自動化を開始
...（定期実行ログ）...

^C
ℹ️  [2024-01-15T10:37:30.000Z] [INFO] 
🛑 Received SIGINT. Shutting down gracefully...
ℹ️  [2024-01-15T10:37:30.000Z] [INFO] Canceled pending automation timer
✅ [2024-01-15T10:37:30.000Z] [SUCCESS] Shutdown complete
```

## 🔧 開発

### プロジェクト構造
```
src/
├── types.ts           # TypeScript型定義
├── logger.ts          # カラー付きコンソールログ
├── config.ts          # 設定読み込みと検証
├── github-client.ts   # GitHub APIクライアントラッパー
├── issue-automation.ts # メイン自動化ロジック
└── index.ts          # エントリーポイントとCLI処理
```

### ビルド
```bash
npm run build    # TypeScriptをJavaScriptにコンパイル
npm run clean    # ビルド成果物を削除
```

### 利用可能なスクリプト
- `npm run build`: TypeScriptをコンパイル
- `npm run start`: コンパイル済みJavaScriptを実行
- `npm run dev`: ts-nodeで実行（開発用）
- `npm run clean`: distフォルダを削除
- `npm run run:automation`: ビルドして実行

## 🐛 トラブルシューティング

### よくある問題

1. **"GITHUB_TOKEN environment variable is required"**
   - `.env`ファイルに`GITHUB_TOKEN`が設定されているか確認
   - トークンに必要な権限があるか確認

2. **"Failed to fetch issues: Request failed with status 404"**
   - `GITHUB_OWNER`と`GITHUB_REPO`設定を確認
   - リポジトリが存在し、トークンでアクセス可能か確認

3. **"Node.js version 18 or later is required"**
   - Node.jsをバージョン18以上に更新
   - `node --version`で確認

4. **ビルドエラー**
   - `node_modules`を削除して`npm install`を再実行
   - TypeScriptバージョンの互換性を確認

### デバッグモード

詳細なデバッグには、ロガーを変更するか環境変数チェックを追加:

```bash
DEBUG=1 npm run start
```

## 🔄 CI/CD統合

このスクリプトは様々なCI/CDシステムに統合可能:

### GitHub Actions（代替案）
```yaml
- name: Issue自動化実行
  run: |
    cd scripts/claude-code-automation
    npm install
    npm run build
    npm run start
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Cronジョブ
```bash
# 10分間隔で実行
*/10 * * * * cd /path/to/scripts/claude-code-automation && ./run.sh
```

## 📄 ライセンス

MITライセンス - 詳細はメインプロジェクトのライセンスを参照してください。
# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## 概要

これは「ai task」ラベルが付いたGitHub Issueの処理を自動化するTypeScriptベースのGitHub Issue自動化スクリプトです。スクリプトは、ワンショットモードとデーモンモードの両方で実行でき、対象のissueに自動的にコメントを投稿し、処理ラベルを追加します。

## 開発コマンド

### ビルドと実行
```bash
npm run build          # TypeScriptをJavaScriptにコンパイル
npm run start          # コンパイルされたJavaScriptを実行
npm run dev           # 開発用にts-nodeで実行
npm run clean         # distディレクトリを削除
npm run run:automation # ビルドと実行を一度に
```

### スクリプト実行
```bash
./run.sh              # ワンショット実行（ビルドして実行）
./run-daemon.sh       # デーモンモード（5分毎に実行）
./run-daemon.sh --interval 600  # カスタム間隔（10分毎）
./run-daemon.sh --background    # バックグラウンドで実行
./run-daemon.sh --status       # デーモンステータスを確認
./run-daemon.sh --stop         # デーモンを停止
```

## アーキテクチャ

コードベースは関心の分離が明確なモジュラーTypeScriptアーキテクチャに従っています：

### コアコンポーネント

- **`index.ts`**: CLIアーグメント、デーモンモード、グレースフルシャットダウンを処理するメインエントリーポイント
- **`issue-automation.ts`**: GitHub Actionsワークフローを再現するコア自動化ロジック
- **`github-client.ts`**: issue操作にOctokitを使用するGitHub APIラッパー
- **`config.ts`**: 環境変数の読み込みと検証を行う設定管理
- **`logger.ts`**: 色付きコンソール出力を持つ構造化ログ
- **`types.ts`**: GitHub APIレスポンスと設定用のTypeScriptインターフェース

### 主要なアーキテクチャパターン

1. **依存性注入**: 設定とロガーがクラスに注入される
2. **エラーハンドリング**: グレースフルフォールバック付きの包括的エラーハンドリング
3. **Async/Await**: 全体を通じて最新のasyncパターン
4. **モジュラー設計**: 各コンポーネントが単一の責任を持つ

### 設定システム

システムは合理的なデフォルト値を持つ環境変数を使用します：
- `GITHUB_TOKEN` (必須): GitHub個人アクセストークン
- `GITHUB_OWNER` / `GITHUB_REPO`: リポジトリ詳細
- `TASK_LABEL` / `DOING_LABEL`: ラベル設定
- `DAEMON_MODE` / `DAEMON_INTERVAL`: デーモン設定
- `MAX_ISSUES_PER_RUN`: レート制限

### Issue処理ロジック

自動化は特定のワークフローに従います：
1. タスクラベル（`ai task`）を持つissueをチェック
2. 既に処理中のissue（`ai doing`ラベル）を除外
3. 最新コメントに`@claude`があるissueをスキップ
4. 最初の対象issueにコメントを投稿し、ラベルを追加して処理
5. 概要レポートを生成

## テスト

特定のテストフレームワークは設定されていません。テストを実装する際は、package.jsonのテストスクリプト設定を確認するか、お好みのテストアプローチについてユーザーに尋ねてください。

## 開発ノート

- ESモジュールを使用（package.jsonで`"type": "module"`）
- TypeScript設定は`tsconfig.json`内
- package.jsonのenginesで指定されているようにNode.js 18+が必要
- GitHub API相互作用にOctokit v20を使用
- デーモンモード用のグレースフルシャットダウンハンドリングを含む
- デバッグと監視のための包括的ログ

## 一般的なタスク

このコードベースで作業する際は：
1. 環境変数が適切に設定されていることを常に確認
2. ワンショットモードとデーモンモードの両方をテスト
3. GitHub APIレート制限とエラーハンドリングを確認
4. 問題のデバッグのためにログ出力を確認
5. デプロイ前にTypeScriptコンパイルが適切に行われることを確認
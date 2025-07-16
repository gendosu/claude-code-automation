#!/bin/bash

# GitHub Issue自動化スクリプト - Daemonモード実行スクリプト

set -e

# スクリプトのディレクトリに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# カラー出力の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルプ表示
show_help() {
    echo -e "${BLUE}GitHub Issue自動化スクリプト - Daemonモード${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  -h, --help                 このヘルプを表示"
    echo "  -i, --interval SECONDS     実行間隔（秒）（デフォルト: 300）"
    echo "  -b, --background          バックグラウンドで実行"
    echo "  -s, --stop                実行中のdaemonを停止"
    echo "  --status                  daemon状態を確認"
    echo ""
    echo "環境変数:"
    echo "  DAEMON_INTERVAL           実行間隔（ミリ秒）"
    echo "  DAEMON_MODE               'true'でdaemonモード有効"
    echo ""
    echo "例:"
    echo "  $0                        # フォアグラウンドでdaemon開始"
    echo "  $0 -i 600                 # 10分間隔で実行"
    echo "  $0 -b                     # バックグラウンドで実行"
    echo "  $0 --stop                 # daemon停止"
    echo "  $0 --status               # 状態確認"
}

# PIDファイルのパス
PID_FILE="$SCRIPT_DIR/.daemon.pid"
LOG_FILE="$SCRIPT_DIR/daemon.log"

# Daemon状態確認
check_daemon_status() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}✅ Daemon is running (PID: $pid)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  PID file exists but process is not running${NC}"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        echo -e "${RED}❌ Daemon is not running${NC}"
        return 1
    fi
}

# Daemon停止
stop_daemon() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}🛑 Stopping daemon (PID: $pid)...${NC}"
            kill -TERM "$pid"
            
            # プロセスが終了するまで待機
            local count=0
            while kill -0 "$pid" 2>/dev/null && [[ $count -lt 30 ]]; do
                sleep 1
                ((count++))
            done
            
            if kill -0 "$pid" 2>/dev/null; then
                echo -e "${RED}⚠️  Force killing daemon...${NC}"
                kill -KILL "$pid"
            fi
            
            rm -f "$PID_FILE"
            echo -e "${GREEN}✅ Daemon stopped${NC}"
        else
            echo -e "${YELLOW}⚠️  PID file exists but process is not running${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${RED}❌ Daemon is not running${NC}"
    fi
}

# デフォルト値
INTERVAL_SECONDS=300
BACKGROUND=false
STOP=false
STATUS=false

# コマンドライン引数の解析
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -i|--interval)
            INTERVAL_SECONDS="$2"
            shift 2
            ;;
        -b|--background)
            BACKGROUND=true
            shift
            ;;
        -s|--stop)
            STOP=true
            shift
            ;;
        --status)
            STATUS=true
            shift
            ;;
        *)
            echo -e "${RED}❌ 不明なオプション: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 状態確認モード
if [[ "$STATUS" == true ]]; then
    check_daemon_status
    exit $?
fi

# 停止モード
if [[ "$STOP" == true ]]; then
    stop_daemon
    exit 0
fi

# 既にdaemonが実行中かチェック
if check_daemon_status > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Daemon is already running${NC}"
    check_daemon_status
    exit 1
fi

# 必要なファイルの存在確認
if [[ ! -f "package.json" ]]; then
    echo -e "${RED}❌ package.jsonが見つかりません${NC}"
    exit 1
fi

if [[ ! -f ".env" ]]; then
    echo -e "${YELLOW}⚠️  .envファイルが見つかりません。.env.exampleを参考に作成してください${NC}"
    exit 1
fi

# 依存関係の確認とビルド
echo -e "${BLUE}🔧 Building project...${NC}"
if ! npm run build; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 環境変数の設定
export DAEMON_MODE=true
export DAEMON_INTERVAL=$((INTERVAL_SECONDS * 1000))

echo -e "${BLUE}🚀 Starting GitHub Issue Automation Daemon${NC}"
echo -e "📋 Interval: ${INTERVAL_SECONDS} seconds"
echo -e "📁 Log file: ${LOG_FILE}"

# バックグラウンド実行の場合
if [[ "$BACKGROUND" == true ]]; then
    echo -e "${BLUE}🔄 Starting daemon in background...${NC}"
    
    # バックグラウンドでdaemon開始
    nohup npm run start > "$LOG_FILE" 2>&1 &
    local daemon_pid=$!
    echo "$daemon_pid" > "$PID_FILE"
    
    # 少し待ってからプロセスが正常に開始されたかチェック
    sleep 2
    if kill -0 "$daemon_pid" 2>/dev/null; then
        echo -e "${GREEN}✅ Daemon started successfully (PID: $daemon_pid)${NC}"
        echo -e "📋 Use '$0 --status' to check status"
        echo -e "📋 Use '$0 --stop' to stop daemon"
        echo -e "📋 View logs: tail -f $LOG_FILE"
    else
        echo -e "${RED}❌ Failed to start daemon${NC}"
        rm -f "$PID_FILE"
        exit 1
    fi
else
    # フォアグラウンドで実行
    echo -e "${BLUE}🔄 Starting daemon in foreground...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
    
    # フォアグラウンドでdaemon開始
    npm run start
fi
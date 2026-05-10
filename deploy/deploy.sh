#!/bin/bash
###############################################################################
# warrescue.com 一键部署脚本
# 用法: 将 dist 目录和 deploy 目录上传到服务器后, 以 root 运行此脚本
#   sudo bash deploy.sh
###############################################################################

set -e

DOMAIN="warrescue.com"
WEB_ROOT="/var/www/warrescue"
NGINX_CONF="/etc/nginx/sites-available/warrescue"
NGINX_ENABLED="/etc/nginx/sites-enabled/warrescue"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  warrescue.com 部署脚本"
echo "============================================"
echo ""

# ---- 1. 检测操作系统 ----
echo "[1/6] 检测操作系统..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
    OS_VERSION="$VERSION_ID"
    echo "  系统: $PRETTY_NAME"
else
    echo "  无法检测操作系统, 尝试继续..."
    OS_ID="unknown"
fi

# 判断包管理器
if command -v apt-get &>/dev/null; then
    PKG_MGR="apt"
elif command -v yum &>/dev/null; then
    PKG_MGR="yum"
elif command -v dnf &>/dev/null; then
    PKG_MGR="dnf"
else
    echo "  [错误] 无法找到包管理器(apt/yum/dnf), 请手动安装 Nginx"
    exit 1
fi
echo "  包管理器: $PKG_MGR"

# ---- 2. 安装/检查 Nginx ----
echo ""
echo "[2/6] 检查 Nginx..."
if command -v nginx &>/dev/null; then
    echo "  Nginx 已安装: $(nginx -v 2>&1)"
else
    echo "  Nginx 未安装, 正在安装..."
    if [ "$PKG_MGR" = "apt" ]; then
        apt-get update -qq && apt-get install -y -qq nginx
    elif [ "$PKG_MGR" = "yum" ]; then
        yum install -y epel-release && yum install -y nginx
    elif [ "$PKG_MGR" = "dnf" ]; then
        dnf install -y nginx
    fi
    echo "  Nginx 安装完成"
fi

# 确保 Nginx 启动
systemctl enable nginx
systemctl start nginx

# ---- 3. 部署网站文件 ----
echo ""
echo "[3/6] 部署网站文件..."
mkdir -p "$WEB_ROOT"

# 检查 dist 目录位置
DIST_DIR=""
if [ -d "$SCRIPT_DIR/../dist" ]; then
    DIST_DIR="$SCRIPT_DIR/../dist"
elif [ -d "$SCRIPT_DIR/dist" ]; then
    DIST_DIR="$SCRIPT_DIR/dist"
else
    echo "  [错误] 找不到 dist 目录"
    echo "  请确保 dist 目录与 deploy 目录在同一级, 或者在 deploy 目录内"
    exit 1
fi

cp -r "$DIST_DIR"/* "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true
echo "  文件已部署到 $WEB_ROOT"

# ---- 4. 配置 Nginx 虚拟主机 ----
echo ""
echo "[4/6] 配置 Nginx 虚拟主机..."

# 检查 Nginx 配置结构 (Debian/Ubuntu 用 sites-available, CentOS 用 conf.d)
if [ -d /etc/nginx/sites-available ]; then
    # Debian/Ubuntu 结构
    cp "$SCRIPT_DIR/nginx-warrescue.conf" "$NGINX_CONF"
    ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
    echo "  配置已写入 $NGINX_CONF"
elif [ -d /etc/nginx/conf.d ]; then
    # CentOS/RHEL 结构
    cp "$SCRIPT_DIR/nginx-warrescue.conf" /etc/nginx/conf.d/warrescue.conf
    echo "  配置已写入 /etc/nginx/conf.d/warrescue.conf"
else
    echo "  [警告] 无法确定 Nginx 配置目录, 手动复制 nginx-warrescue.conf"
fi

# 测试 Nginx 配置
echo "  测试 Nginx 配置..."
if nginx -t 2>&1; then
    systemctl reload nginx
    echo "  Nginx 配置加载成功"
else
    echo "  [错误] Nginx 配置有误, 请检查"
    exit 1
fi

# ---- 5. 配置 SSL 证书 (Let's Encrypt) ----
echo ""
echo "[5/6] 配置 HTTPS (SSL 证书)..."

if command -v certbot &>/dev/null; then
    echo "  Certbot 已安装"
else
    echo "  安装 Certbot..."
    if [ "$PKG_MGR" = "apt" ]; then
        apt-get install -y -qq certbot python3-certbot-nginx
    elif [ "$PKG_MGR" = "yum" ]; then
        yum install -y certbot python3-certbot-nginx
    elif [ "$PKG_MGR" = "dnf" ]; then
        dnf install -y certbot python3-certbot-nginx
    fi
fi

echo ""
echo "  即将申请 SSL 证书..."
echo "  注意: 请确保 DNS 已经将 $DOMAIN 指向本服务器 IP"
echo ""
read -p "  DNS 是否已配置好? (y/n): " dns_ready

if [ "$dns_ready" = "y" ] || [ "$dns_ready" = "Y" ]; then
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || {
        echo ""
        echo "  [提示] 自动申请失败, 可能是 DNS 还没生效"
        echo "  请稍后手动运行:"
        echo "    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
    }
else
    echo "  跳过 SSL 配置, 请先配置 DNS 后手动运行:"
    echo "    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

# ---- 6. 设置 certbot 自动续期 ----
echo ""
echo "[6/6] 设置证书自动续期..."
if systemctl list-timers | grep -q certbot; then
    echo "  certbot 自动续期已启用"
else
    # 添加 crontab 续期
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -
    echo "  已添加 crontab 自动续期任务 (每天凌晨3点检查)"
fi

# ---- 完成 ----
echo ""
echo "============================================"
echo "  部署完成!"
echo "============================================"
echo ""
echo "  网站目录: $WEB_ROOT"
echo "  Nginx 配置: 已生效"
echo ""

SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "  服务器 IP: $SERVER_IP"
echo ""
echo "  下一步操作:"
echo "  1. 在阿里云 DNS 控制台添加以下解析记录:"
echo "     - 记录类型: A"
echo "     - 主机记录: @"
echo "     - 记录值: $SERVER_IP"
echo "     ---"
echo "     - 记录类型: A"
echo "     - 主机记录: www"
echo "     - 记录值: $SERVER_IP"
echo ""
echo "  2. DNS 生效后, 运行以下命令申请 HTTPS 证书:"
echo "     sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "  3. 访问 http://$DOMAIN 或 https://$DOMAIN 验证"
echo "============================================"

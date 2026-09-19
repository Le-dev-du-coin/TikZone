#!/bin/bash
# ==============================================================================
# MIKROOT VPN SERVER - INSTALLATION & AUTOMATISATION (Ubuntu 22.04 / 24.04 LTS)
# Supporte à la fois RouterOS 7 (WireGuard) et RouterOS 6 (L2TP/IPsec)
# Redirige les ports API (41000-42000) et Winbox (51000-52000)
# ==============================================================================

set -e

# Vérification des privilèges root
if [ "$EUID" -ne 0 ]; then
  echo "[-] Veuillez exécuter ce script en tant que root (sudo ./setup-vpn-server.sh)"
  exit 1
fi

echo "[+] ==========================================================="
echo "[+] Initialisation du Déploiement Serveur VPN Mikroot..."
echo "[+] ==========================================================="

# 1. Mise à jour système et installation des paquets
echo "[1/6] Mise à jour des paquets et installation des dépendances..."
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  wireguard \
  wireguard-tools \
  iptables \
  iptables-persistent \
  net-tools \
  curl \
  jq \
  python3 \
  python3-pip \
  python3-venv \
  xl2tpd \
  strongswan

# 2. Activation de l'IP Forwarding dans le noyau Linux
echo "[2/6] Activation du routage IPv4 (IP Forwarding)..."
sysctl -w net.ipv4.ip_forward=1
sed -i '/^#net.ipv4.ip_forward=1/c\net.ipv4.ip_forward=1' /etc/sysctl.conf
sed -i '/^net.ipv4.ip_forward=0/c\net.ipv4.ip_forward=1' /etc/sysctl.conf
sysctl -p /etc/sysctl.conf

# 3. Détection de l'interface réseau publique principale (IPv4 obligatoire)
MAIN_IFACE=$(ip route get 8.8.8.8 | awk -- '{printf $5}')
SERVER_IP=$(curl -4 -s ifconfig.me || curl -4 -s icanhazip.com || ip route get 8.8.8.8 | awk '{print $7}')
echo "[+] Interface réseau publique détectée : $MAIN_IFACE ($SERVER_IP)"

# 4. Génération des Clés WireGuard pour le Serveur
echo "[3/6] Configuration de WireGuard (RouterOS 7)..."
mkdir -p /etc/wireguard
chmod 700 /etc/wireguard

if [ ! -f /etc/wireguard/server_private.key ]; then
  wg genkey | tee /etc/wireguard/server_private.key | wg pubkey | tee /etc/wireguard/server_public.key
  chmod 600 /etc/wireguard/server_private.key
fi

SERVER_PRIVKEY=$(cat /etc/wireguard/server_private.key)
SERVER_PUBKEY=$(cat /etc/wireguard/server_public.key)

cat <<EOF > /etc/wireguard/wg0.conf
# Mikroot VPN Server Interface (RouterOS 7 Tunnel)
[Interface]
Address = 172.29.88.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIVKEY
SaveConfig = true

# Règles IPTables automatiques pour NAT et Forwarding
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -A FORWARD -o wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o $MAIN_IFACE -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -D FORWARD -o wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o $MAIN_IFACE -j MASQUERADE
EOF

chmod 600 /etc/wireguard/wg0.conf

# Démarrage et activation du service WireGuard
systemctl enable wg-quick@wg0
systemctl restart wg-quick@wg0

# 5. Configuration de L2TP/IPsec (RouterOS 6)
echo "[4/6] Configuration de L2TP/IPsec (RouterOS 6)..."
cat <<EOF > /etc/xl2tpd/xl2tpd.conf
[global]
port = 1701

[lns default]
ip range = 172.29.89.100-172.29.89.250
local ip = 172.29.89.1
require chap = yes
refuse pap = yes
require authentication = yes
name = mikroot-l2tp
pppoptfile = /etc/ppp/options.xl2tpd
length bit = yes
EOF

cat <<EOF > /etc/ppp/options.xl2tpd
require-mschap-v2
ms-dns 8.8.8.8
ms-dns 1.1.1.1
auth
mtu 1400
mru 1400
nodefaultroute
proxyarp
connect-delay 5000
EOF

systemctl enable xl2tpd
systemctl restart xl2tpd

# 6. Règles de Redirection de Ports IPTables (Port Forwarding API & Winbox)
echo "[5/6] Configuration des règles de redirection dynamique de ports..."
iptables -t nat -F PREROUTING

# Redirection dynamique des ports 41002-41250 vers 172.29.88.x:8728 (API)
# et 51002-51250 vers 172.29.88.x:8291 (Winbox)
for i in $(seq 2 250); do
  PORT_API=$((41000 + i))
  PORT_WINBOX=$((51000 + i))
  CLIENT_IP="172.29.88.$i"

  iptables -t nat -A PREROUTING -p tcp --dport $PORT_API -j DNAT --to-destination $CLIENT_IP:8728
  iptables -t nat -A PREROUTING -p tcp --dport $PORT_WINBOX -j DNAT --to-destination $CLIENT_IP:8291
done

netfilter-persistent save

echo "[6/6] Installation terminée avec succès !"
echo "==========================================================="
echo " INFORMATIONS DU SERVEUR VPN MIKROOT"
echo "==========================================================="
echo " IP Publique du Serveur   : $SERVER_IP"
echo " Port WireGuard (UDP)     : 51820"
echo " Clé Publique WireGuard   : $SERVER_PUBKEY"
echo ""
echo "-> À copier dans le fichier .env du Backend Django :"
echo "VPN_SERVER_HOST=vpn.tikzone.net"
echo "# Alternative IPv4 directe si DNS non configuré : VPN_SERVER_HOST=$SERVER_IP"
echo "VPN_WG_SERVER_PUBKEY=$SERVER_PUBKEY"
echo "==========================================================="

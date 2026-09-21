# TikZone (ex-Mikroot SaaS)

**TikZone** est une plateforme SaaS complète et centralisée dédiée à la gestion à distance, la supervision et la monétisation de routeurs réseau **MikroTik RouterOS** (versions 6 et 7).

Elle permet aux gestionnaires de réseaux et aux opérateurs de points d'accès Hotspot de piloter leur infrastructure, de vendre des tickets d'accès Internet, de suivre leur consommation et de gérer les abonnements de manière sécurisée sans nécessiter d'adresse IP publique statique sur chaque site client.

---

## 🌟 Fonctionnalités Principales

- **Tunneling & NAT Traversal Automatisé** :
  - Connexion des routeurs distants derrière tout type de réseau (NAT/CGNAT/4G) via tunnels sécurisés **WireGuard** (RouterOS 7) et **L2TP/IPsec** (RouterOS 6).
  - Attribution automatique des ports distants (API et Winbox) et des adresses IP dédiées sur le réseau privé virtuel.
  - Génération en 1-clic des scripts de configuration RouterOS prêts à être exécutés dans le terminal MikroTik.

- **Moteur Hotspot & Billetterie Vouchers** :
  - Génération de lots de tickets/coupons personnalisables (temps, quota de données, prix, limitation de bande passante).
  - Modèles d'impression de tickets optimisés (A4, rouleau thermique POS, tickets 4 colonnes, code unique simplifié sans mot de passe).
  - Interface utilisateur réactive et pensée *mobile-first* pour la gestion quotidienne sur le terrain.

- **Modèle Multi-tenant & Facturation SaaS** :
  - Architecture multi-utilisateurs avec gestion de portefeuille numérique (Wallet).
  - Souscription par instance logicielle et par routeur connecté avec renouvellement automatique.
  - Espace super-administrateur pour la supervision des clients, des transactions financières et de l'état des tunnels.

---

## 🏛️ Architecture du Projet

Le projet suit une architecture modulaire et générique :

```text
TikZone/
├── backend/            # API REST Django / Python (Core, Auth, Routeurs, Facturation, FreeRADIUS)
├── frontend/           # Application Web SaaS (Dashboard unifié, tickets A4, monitoring en Next.js)
├── infra/              # Infrastructure VPN, scripts de provisionnement et agent de synchronisation
└── docs/               # Documentation technique et guides d'exploitation
```

### Détail des Composants

- **`backend/`** : Conçu avec Django et Django REST Framework. Gère la logique métier, la persistance PostgreSQL, le Moteur Cloud RADIUS, la facturation et l'orchestration des paramètres réseau. Géré avec **Poetry**.
- **`frontend/`** : Interface d'administration moderne unifiée construite avec React, Next.js et Tailwind CSS, offrant la gestion complète des espaces, génération et impression de tickets Hotspot A4, monitoring en temps réel et finances.
- **`infra/vpn/`** : Scripts d'automatisation pour serveurs Linux (WireGuard, IPTables, agent démon Python pour synchroniser dynamiquement les routeurs autorisés sur le VPS).

---

## 🛠️ Stack Technologique

- **Backend** : Python, Django, Django REST Framework, Poetry, SQLite / PostgreSQL.
- **Frontend** : Next.js, React, Tailwind CSS, Lucide Icons.
- **Réseau & VPN** : WireGuard, L2TP/IPsec, IPTables, MikroTik RouterOS API.
- **Déploiement** : Nginx, PM2, Systemd, Ubuntu Server.

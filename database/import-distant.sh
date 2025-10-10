#!/bin/bash

# Script pour importer la structure SQL sur un serveur MySQL distant
# Usage: ./import-distant.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Import de la structure Babines sur MySQL distant"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Demander les informations de connexion
read -p "🔹 Hôte MySQL (ex: mysql.votredomaine.com): " DB_HOST
read -p "🔹 Port MySQL [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}
read -p "🔹 Nom de la base [bane2718_babines]: " DB_NAME
DB_NAME=${DB_NAME:-bane2718_babines}
read -p "🔹 Utilisateur MySQL: " DB_USER
read -sp "🔹 Mot de passe MySQL: " DB_PASSWORD
echo ""
echo ""

# Vérifier que le fichier schema.sql existe
if [ ! -f "schema.sql" ]; then
    echo "❌ Erreur: schema.sql introuvable"
    echo "   Assurez-vous d'être dans le dossier database/"
    exit 1
fi

# Tester la connexion
echo "🔍 Test de connexion..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Connexion réussie !"
else
    echo "❌ Impossible de se connecter au serveur MySQL"
    echo "   Vérifiez vos identifiants et que l'accès distant est autorisé"
    exit 1
fi

# Créer la base si elle n'existe pas
echo ""
echo "📦 Création de la base de données si nécessaire..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" 2>/dev/null

# Importer la structure
echo "📥 Import de la structure SQL..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Structure importée avec succès !"
    
    # Vérifier les tables créées
    echo ""
    echo "📊 Tables créées:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✨ Import terminé avec succès !"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🎯 Prochaines étapes:"
    echo "   1. Allez dans le dossier backend: cd ../backend"
    echo "   2. Créez le fichier .env: cp env.txt .env"
    echo "   3. Modifiez .env avec vos identifiants"
    echo "   4. Installez les dépendances: npm install"
    echo "   5. Démarrez le backend: npm run dev"
    echo ""
else
    echo "❌ Erreur lors de l'import"
    exit 1
fi


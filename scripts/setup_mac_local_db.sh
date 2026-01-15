#!/bin/bash
# MovieSir Local Mac Database Setup
# Sets up PostgreSQL database on local Mac (not Docker)

set -e

echo "🎬 MovieSir Local Mac Database Setup"
echo "====================================="
echo ""

# Configuration from .env.local
DB_NAME="moviesir"
DB_USER="movigation"
DB_PASSWORD="movigation123"
DB_HOST="localhost"
DB_PORT="5432"

# Check PostgreSQL
echo "📡 Checking PostgreSQL..."
if ! pg_isready -q; then
    echo "❌ PostgreSQL not running!"
    echo "   Start it with: brew services start postgresql@16"
    exit 1
fi
echo "✅ PostgreSQL running"
echo ""

# Terminate connections
echo "🔌 Terminating connections to moviesir..."
psql -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DB_NAME'
  AND pid <> pg_backend_pid();
" 2>/dev/null || true
echo ""

# Drop existing database
echo "🗑️  Dropping existing database..."
psql -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || echo "   Database doesn't exist"
echo ""

# Create or update user
echo "👤 Setting up user: $DB_USER..."
psql -d postgres << EOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
        RAISE NOTICE 'User created: $DB_USER';
    ELSE
        ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
        RAISE NOTICE 'User password updated: $DB_USER';
    END IF;
END \$\$;
EOF
echo "✅ User ready"
echo ""

# Create database
echo "🗄️  Creating database: $DB_NAME..."
psql -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo "✅ Database created"
echo ""

# Grant privileges
echo "🔐 Granting privileges..."
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
echo "✅ Privileges granted"
echo ""

# Install pgvector extension
echo "🔧 Installing pgvector extension..."
psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS vector;"
echo "✅ pgvector installed"
echo ""

# Set search_path
echo "🔍 Setting search_path..."
psql -d $DB_NAME << EOF
ALTER DATABASE $DB_NAME SET search_path TO public, b2c, b2b;
ALTER ROLE $DB_USER SET search_path TO public, b2c, b2b;
EOF
echo "✅ search_path configured"
echo ""

# Import main data file
if [ -f "database/init/00_mvdb_local.sql" ]; then
    echo "📥 Importing main data (00_mvdb_local.sql - 174MB)..."
    echo "   This may take 5-10 minutes..."
    echo "   Started at: $(date '+%H:%M:%S')"
    
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME \
        -f database/init/00_mvdb_local.sql 2>&1 | \
        grep -E "CREATE|COPY [0-9]|ERROR" | tail -30 || true
    
    echo "   Completed at: $(date '+%H:%M:%S')"
    echo "✅ Main data imported"
    echo ""
else
    echo "⚠️  Main data file not found: database/init/00_mvdb_local.sql"
    echo ""
fi

# Import test data
if [ -f "database/init/zz_local_testdata.sql" ]; then
    echo "📥 Importing test data (zz_local_testdata.sql)..."
    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME \
        -f database/init/zz_local_testdata.sql 2>&1 | \
        grep -v "does not exist, skipping" || true
    echo "✅ Test data imported"
    echo ""
fi

# Update B2B API key for local development
echo "🔑 Setting up B2B API key..."
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME << 'EOF'
UPDATE b2b.api_keys 
SET access_key = '8bad175acec18d6df6ad47c5c6fc2ebdf3c4c1558b2c35045dd0086f18aa474a'
WHERE key_name = 'moviesir_b2c';
EOF
echo "✅ API key configured (sk-moviesir-local-test-key)"
echo ""

# Verify setup
echo "🔍 Verifying database..."
echo ""

# Check schemas
echo "📂 Schemas:"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -c "\dn" | grep -E "b2b|b2c|public"

echo ""
echo "📊 Tables by schema:"
B2B_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'b2b';" | xargs)
B2C_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'b2c';" | xargs)
PUBLIC_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

echo "   b2b schema: $B2B_COUNT tables"
echo "   b2c schema: $B2C_COUNT tables"
echo "   public schema: $PUBLIC_COUNT tables"

echo ""
echo "📈 Data counts:"
MOVIE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM movies;" 2>/dev/null | xargs || echo "0")
USER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
VECTOR_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM movie_vectors WHERE embedding IS NOT NULL;" 2>/dev/null | xargs || echo "0")

echo "   Movies: $MOVIE_COUNT"
echo "   Users: $USER_COUNT"
echo "   Movie vectors: $VECTOR_COUNT"

echo ""
echo "✅ Local Mac database setup complete!"
echo ""
echo "📝 Connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo ""
echo "🔗 Connection string:"
echo "   postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo "🧪 Test connection:"
echo "   psql -U $DB_USER -d $DB_NAME"
echo ""
echo "🚀 Next steps:"
echo "   1. Update .env.local for local development:"
echo "      DATABASE_HOST=localhost"
echo ""
echo "   2. Start services:"
echo "      cd backend && uvicorn main:app --reload --port 8000"
echo "      cd ai && uvicorn api:app --reload --port 8001"
echo ""

-- =====================================================
-- PREPARAÇÃO: GARANTIR USUÁRIO PADRÃO NA TABELA PROFILES
-- =====================================================
-- Execute ANTES do trigger para garantir que existe um user_id válido

-- 1. VERIFICAR SE TABELA PROFILES EXISTE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'profiles'
    ) THEN
        RAISE NOTICE '⚠️ ATENÇÃO: Tabela profiles não existe!';
        RAISE NOTICE '🔧 Criando tabela profiles básica...';
        
        CREATE TABLE profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'user',
            name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE '✅ Tabela profiles criada';
    ELSE
        RAISE NOTICE '✅ Tabela profiles existe';
    END IF;
END $$;

-- 2. VERIFICAR/CRIAR USUÁRIO PADRÃO PARA SISTEMA
DO $$
DECLARE
    v_admin_id UUID;
    v_user_count INTEGER;
BEGIN
    -- Contar usuários existentes
    SELECT COUNT(*) INTO v_user_count FROM profiles;
    
    RAISE NOTICE 'Usuários existentes na tabela profiles: %', v_user_count;
    
    -- Se não há usuários, criar um admin padrão
    IF v_user_count = 0 THEN
        RAISE NOTICE '📝 Criando usuário admin padrão para o sistema...';
        
        INSERT INTO profiles (
            id,
            email,
            role,
            name,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'admin@sistema.com',
            'admin',
            'Administrador do Sistema',
            NOW(),
            NOW()
        ) RETURNING id INTO v_admin_id;
        
        RAISE NOTICE '✅ Usuário admin criado com ID: %', v_admin_id;
        RAISE NOTICE '📧 Email: admin@sistema.com';
        RAISE NOTICE '👤 Role: admin';
        
    ELSE
        -- Verificar se existe pelo menos um admin ou organizador
        SELECT COUNT(*) INTO v_user_count 
        FROM profiles 
        WHERE role IN ('admin', 'organizer');
        
        IF v_user_count = 0 THEN
            RAISE NOTICE '⚠️ Nenhum admin/organizador encontrado';
            RAISE NOTICE '🔧 Promovendo primeiro usuário para admin...';
            
            UPDATE profiles 
            SET role = 'admin', 
                updated_at = NOW()
            WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1)
            RETURNING id INTO v_admin_id;
            
            RAISE NOTICE '✅ Usuário promovido para admin: %', v_admin_id;
        ELSE
            RAISE NOTICE '✅ Admin/organizador já existe (%)', v_user_count;
        END IF;
    END IF;
END $$;

-- 3. MOSTRAR USUÁRIOS DISPONÍVEIS PARA O TRIGGER
SELECT 
    'USUARIOS_DISPONIVEIS' as info,
    id,
    email,
    role,
    name,
    created_at
FROM profiles 
ORDER BY 
    CASE role 
        WHEN 'admin' THEN 1
        WHEN 'organizer' THEN 2
        ELSE 3
    END,
    created_at ASC;

-- 4. VERIFICAR SE TRIGGER PODE FUNCIONAR
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Tentar encontrar usuário para usar no trigger
    SELECT id INTO v_user_id
    FROM profiles 
    WHERE role IN ('admin', 'organizer')
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
        RAISE NOTICE '🎯 PRONTO! Trigger pode usar user_id: %', v_user_id;
        RAISE NOTICE '✅ Execute agora: trigger_auto_create_tickets_fixed_user_id.sql';
    ELSE
        -- Tentar qualquer usuário
        SELECT id INTO v_user_id
        FROM profiles 
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE '🎯 PRONTO! Trigger pode usar user_id: %', v_user_id;
            RAISE NOTICE '⚠️ Usuário não é admin/organizador, mas funciona';
            RAISE NOTICE '✅ Execute agora: trigger_auto_create_tickets_fixed_user_id.sql';
        ELSE
            RAISE NOTICE '❌ ERRO: Ainda não há usuários disponíveis!';
            RAISE NOTICE '🔧 Algo deu errado na criação do usuário padrão';
        END IF;
    END IF;
END $$;

RAISE NOTICE '🎯 PREPARAÇÃO CONCLUÍDA!';
RAISE NOTICE '📝 Agora execute: trigger_auto_create_tickets_fixed_user_id.sql';
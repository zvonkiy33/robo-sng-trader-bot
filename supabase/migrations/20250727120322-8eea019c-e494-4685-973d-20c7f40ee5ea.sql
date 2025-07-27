-- Включаем расширение для шифрования
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Создаем функцию для шифрования API ключей
CREATE OR REPLACE FUNCTION public.encrypt_api_credential(credential_text text)
RETURNS text AS $$
DECLARE
    encryption_key text;
BEGIN
    -- Используем комбинацию project ref и статичного ключа
    encryption_key := 'bemevsvoentrlojsxsdp_api_key_2024';
    
    -- Шифруем данные с помощью AES
    RETURN encode(
        encrypt(
            credential_text::bytea, 
            encryption_key::bytea, 
            'aes'
        ), 
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для дешифрования API ключей
CREATE OR REPLACE FUNCTION public.decrypt_api_credential(encrypted_credential text)
RETURNS text AS $$
DECLARE
    encryption_key text;
BEGIN
    -- Используем тот же ключ для расшифровки
    encryption_key := 'bemevsvoentrlojsxsdp_api_key_2024';
    
    -- Расшифровываем данные
    RETURN convert_from(
        decrypt(
            decode(encrypted_credential, 'base64'), 
            encryption_key::bytea, 
            'aes'
        ), 
        'UTF8'
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Если расшифровка не удалась, возвращаем исходное значение
        -- (для совместимости с существующими незашифрованными данными)
        RETURN encrypted_credential;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Добавляем колонку для отслеживания зашифрованных данных
ALTER TABLE public.api_credentials 
ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false;

-- Создаем функцию для безопасного обновления API ключей
CREATE OR REPLACE FUNCTION public.update_api_credentials_secure(
    p_user_id uuid,
    p_api_key text,
    p_api_secret text,
    p_exchange text DEFAULT 'bybit',
    p_is_demo boolean DEFAULT true
)
RETURNS void AS $$
BEGIN
    -- Удаляем старые записи для этого пользователя и типа
    DELETE FROM public.api_credentials 
    WHERE user_id = p_user_id 
    AND exchange = p_exchange 
    AND is_demo = p_is_demo;
    
    -- Вставляем новую зашифрованную запись
    INSERT INTO public.api_credentials (
        user_id,
        api_key,
        api_secret,
        exchange,
        is_demo,
        is_encrypted,
        is_active
    ) VALUES (
        p_user_id,
        encrypt_api_credential(p_api_key),
        encrypt_api_credential(p_api_secret),
        p_exchange,
        p_is_demo,
        true,
        true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для получения расшифрованных учетных данных
CREATE OR REPLACE FUNCTION public.get_decrypted_credentials(
    p_user_id uuid,
    p_exchange text DEFAULT 'bybit',
    p_is_demo boolean DEFAULT true
)
RETURNS TABLE(
    api_key text,
    api_secret text
) AS $$
DECLARE
    cred_record RECORD;
BEGIN
    -- Получаем запись учетных данных
    SELECT * INTO cred_record
    FROM public.api_credentials 
    WHERE user_id = p_user_id 
    AND exchange = p_exchange 
    AND is_demo = p_is_demo 
    AND is_active = true
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF FOUND THEN
        IF cred_record.is_encrypted THEN
            -- Возвращаем расшифрованные данные
            RETURN QUERY SELECT 
                decrypt_api_credential(cred_record.api_key),
                decrypt_api_credential(cred_record.api_secret);
        ELSE
            -- Возвращаем незашифрованные данные (для совместимости)
            RETURN QUERY SELECT 
                cred_record.api_key,
                cred_record.api_secret;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
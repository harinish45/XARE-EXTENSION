// API Key Encryption using Web Crypto API

const ENCRYPTION_KEY_NAME = 'xare-encryption-key';

async function getOrCreateKey(): Promise<CryptoKey> {
    // Try to get existing key from storage
    const stored = await chrome.storage.local.get(ENCRYPTION_KEY_NAME);

    if (stored[ENCRYPTION_KEY_NAME]) {
        // Import existing key - handle both array and object formats
        const keyArrayData = Array.isArray(stored[ENCRYPTION_KEY_NAME])
            ? stored[ENCRYPTION_KEY_NAME]
            : Object.values(stored[ENCRYPTION_KEY_NAME]);
        const keyData = new Uint8Array(keyArrayData);
        return await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    await chrome.storage.local.set({
        [ENCRYPTION_KEY_NAME]: Array.from(new Uint8Array(exportedKey))
    });

    return key;
}

export async function encryptApiKey(plaintext: string): Promise<string> {
    const key = await getOrCreateKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    // Combine IV + encrypted data and encode as base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
}

export async function decryptApiKey(ciphertext: string): Promise<string> {
    try {
        const key = await getOrCreateKey();

        // Decode from base64
        const combined = new Uint8Array(
            atob(ciphertext).split('').map(c => c.charCodeAt(0))
        );

        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch {
        // If decryption fails (e.g., old unencrypted key), return as-is
        return ciphertext;
    }
}

// Check if a string looks encrypted (base64)
export function isEncrypted(value: string): boolean {
    // Encrypted values are longer and base64
    if (value.length < 20) return false;
    try {
        atob(value);
        return value.includes('=') || /^[A-Za-z0-9+/]+$/.test(value);
    } catch {
        return false;
    }
}

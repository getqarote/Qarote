# RabbitMQ Scout Security Implementation

## 🔐 Server Credentials Encryption

This application implements strong encryption for sensitive RabbitMQ server credentials to protect against data breaches and unauthorized access.

### What's Encrypted

- **RabbitMQ usernames** - Encrypted before storage in database
- **RabbitMQ passwords** - Encrypted before storage in database
- **Connection credentials** - Never logged in plain text

### Encryption Method

- **Algorithm**: AES-256-CBC
- **Key derivation**: scrypt with salt
- **IV**: Random 16-byte initialization vector per encryption
- **Format**: `{iv_hex}:{encrypted_data_hex}`

### Security Features

✅ **Database Security**: Credentials encrypted at rest  
✅ **API Security**: Passwords never returned in responses  
✅ **Logging Security**: Passwords masked in all logs  
✅ **Key Management**: Environment variable based key storage  
✅ **Migration Safe**: Backward compatible with existing data

## 🚀 Setup Instructions

### 1. Generate Encryption Key

```bash
# Generate a secure encryption key
node scripts/generate-encryption-key.js
```

### 2. Configure Environment

Add to your `.env` file:

```bash
ENCRYPTION_KEY=your-generated-32-character-hex-key
```

### 3. Migrate Existing Data (if applicable)

If you have existing server credentials in the database:

```bash
# Run the migration script to encrypt existing credentials
npx ts-node scripts/migrate-server-encryption.ts
```

## 🔧 Implementation Details

### Encryption Service

```typescript
import { EncryptionService } from "@/services/encryption.service";

// Encrypt sensitive data
const encrypted = EncryptionService.encrypt("sensitive-data");

// Decrypt when needed
const decrypted = EncryptionService.decrypt(encrypted);
```

### Server Controller Usage

```typescript
// Before storing - encrypt credentials
const server = await prisma.rabbitMQServer.create({
  data: {
    username: EncryptionService.encrypt(data.username),
    password: EncryptionService.encrypt(data.password),
    // ... other fields
  },
});

// Before using - decrypt credentials
const client = new RabbitMQClient(getDecryptedCredentials(server));
```

## 🏭 Production Deployment

### Environment Setup

1. **Generate unique keys** for each environment
2. **Use secure key management** (AWS KMS, Azure Key Vault, etc.)
3. **Set proper environment variables**:
   ```bash
   ENCRYPTION_KEY=production-key-different-from-dev
   JWT_SECRET=production-jwt-secret
   ```

### Security Checklist

- [ ] Unique encryption key per environment
- [ ] Encryption key stored securely (not in code)
- [ ] Database backups include encrypted data
- [ ] Key rotation strategy planned
- [ ] Access controls on environment variables
- [ ] Monitoring for decryption failures

## 🔄 Key Rotation

When rotating encryption keys:

1. **Deploy new key** alongside old key
2. **Re-encrypt all data** with new key
3. **Remove old key** after migration
4. **Test decryption** of all data

## 🚨 Security Considerations

### Environment Variables

- Never commit encryption keys to version control
- Use different keys for dev/staging/production
- Store production keys in secure key management systems

### Database Security

- Even with encryption, secure your database access
- Use SSL connections to database
- Implement proper database user permissions

### Application Security

- Ensure HTTPS in production
- Implement proper authentication and authorization
- Regular security audits and updates

## 🔍 Troubleshooting

### Decryption Failures

- Check environment variable `ENCRYPTION_KEY` is set
- Verify key matches the one used for encryption
- Check data format includes colon separator `iv:data`

### Migration Issues

- Backup database before migration
- Test migration on staging environment first
- Monitor application logs during migration

### Performance Considerations

- Encryption/decryption adds minimal overhead
- Consider caching decrypted credentials for high-frequency operations
- Monitor CPU usage after deployment

## 📚 Additional Resources

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Database Encryption Best Practices](https://owasp.org/www-community/guides/Database_Security_Cheat_Sheet)

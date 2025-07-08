# Swap Files in Rabbit Scout Infrastructure

This document explains the swap file configuration in our Dokku server setup and why it's essential for database and application servers.

## 🧠 What is a Swap File?

A **swap file** is a file on your hard disk that the operating system uses as virtual memory when your physical RAM is full. It acts as an overflow area for your system's memory.

```bash
# Memory hierarchy (fastest to slowest):
1. CPU Cache:    Nanoseconds
2. RAM:          Nanoseconds
3. SSD Swap:     Microseconds
4. HDD Swap:     Milliseconds
```

Think of it as your computer's "emergency memory" - when RAM runs out, the system uses the swap file to avoid crashes.

## 🏗️ Our Infrastructure Setup

### **Staging Environment**

```bash
Server Type: CPX11 (2 vCPU, 2GB RAM, 40GB SSD)
Swap Size:   1GB (configured for combined app + database)
Total Memory: 3GB effective (2GB RAM + 1GB swap)
Cost: €4.62/month
```

### **Production Environment**

**Database Server (CPX31):**

```bash
Server Type: CPX31 (4 vCPU, 8GB RAM, 160GB SSD)
Swap Size:   2GB (database-optimized)
Total Memory: 10GB effective (8GB RAM + 2GB swap)
Cost: €15.72/month
```

**Application Servers (2x CPX31):**

```bash
Server Type: CPX31 (4 vCPU, 8GB RAM, 160GB SSD)
Swap Size:   1GB each (application-optimized)
Total Memory: 9GB effective each (8GB RAM + 1GB swap)
Cost: €15.72/month each
```

## 🗄️ Why Database Servers Need More Swap

Database servers have unique memory usage patterns that require larger swap files:

### **PostgreSQL Memory Usage:**

```sql
-- Typical PostgreSQL memory allocation:
shared_buffers:     25% of RAM (2GB on 8GB server)
work_mem:           4MB per connection (can multiply quickly)
maintenance_work_mem: 64MB for maintenance operations
effective_cache_size: 75% of RAM (6GB on 8GB server)
```

### **Memory Spike Scenarios:**

1. **Large Queries**: Complex JOINs or aggregations
2. **Bulk Operations**: Large INSERT/UPDATE batches
3. **Maintenance Tasks**: VACUUM, REINDEX, backups
4. **Connection Spikes**: Many simultaneous connections

## 🚨 What Happens Without Swap

Without swap files, your servers are vulnerable to **Out of Memory (OOM) kills**:

```bash
# Without swap:
Memory usage hits 100% → Linux OOM killer activates
↓
PostgreSQL process gets killed → Database crashes
↓
Application loses database connection → Service outage
↓
Manual intervention required → Downtime
```

## ✅ Benefits of Swap Files

With proper swap configuration:

```bash
# With swap:
Memory usage hits 100% → System uses swap as overflow
↓
PostgreSQL continues running (slower but stable)
↓
Application keeps working → No service interruption
↓
Auto-recovery when memory pressure decreases
```

## 🔧 Our Swap Configuration

### **Database Server Setup Script:**

```bash
# Create a 2GB swap file for database server
echo "💾 Creating swap file for database server..."
fallocate -l 2G /swapfile
chmod 600 /swapfile        # Secure permissions
mkswap /swapfile           # Format as swap
swapon /swapfile           # Activate immediately
echo '/swapfile none swap sw 0 0' >> /etc/fstab  # Persist across reboots
```

### **Application Server Setup Script:**

```bash
# Create a 1GB swap file for application server
echo "💾 Creating swap file for application server..."
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## 📊 Swap Size Guidelines

### **General Rules:**

```bash
# Traditional recommendations:
RAM ≤ 2GB:   Swap = 2x RAM
RAM 2-8GB:   Swap = 1x RAM
RAM > 8GB:   Swap = 0.5x RAM

# Our optimized setup:
Database Server (8GB RAM): 2GB swap (25% of RAM)
App Servers (8GB RAM):     1GB swap (12.5% of RAM)
Staging (2GB RAM):         1GB swap (50% of RAM)
```

### **Why Our Sizes:**

- **Database**: Needs more swap for memory-intensive operations
- **Applications**: Lower memory usage, smaller swap needed
- **Staging**: Combined workload, moderate swap size

## 📈 Performance Impact

### **Speed Comparison:**

```bash
RAM Access:     ~100ns
SSD Swap:       ~100μs  (1000x slower than RAM)
Network I/O:    ~1ms    (10x slower than SSD)
```

### **Real-world Impact:**

- **Normal Operation**: Swap rarely used (< 1% utilization)
- **Memory Pressure**: Temporary slowdown vs. complete crash
- **Recovery**: Automatic when memory pressure decreases

## 🔍 Monitoring Swap Usage

### **Check Swap Status:**

```bash
# View current swap usage
free -h
sudo swapon -s

# Monitor swap usage over time
watch -n 1 free -h
```

### **Healthy Swap Usage:**

```bash
# Good indicators:
Swap usage: < 10% of swap size
Swap in/out: Minimal activity
Memory available: > 10% of RAM
```

## ⚙️ Swap Optimization

### **Swappiness Setting:**

```bash
# Default swappiness: 60 (too aggressive for servers)
# Database servers: 10 (conservative)
# Application servers: 20 (moderate)

# Set swappiness (0-100, lower = less aggressive)
echo 'vm.swappiness=10' >> /etc/sysctl.conf
sysctl -p
```

### **I/O Priority:**

```bash
# Ensure swap file is on SSD for better performance
# Our Hetzner servers use SSD storage by default
df -h /swapfile
```

## 🚨 Emergency Scenarios

### **When Swap Saves You:**

1. **Database Backup Process:**

   ```bash
   # pg_dump temporarily doubles memory usage
   Without swap: Backup fails, database crashes
   With swap:    Backup completes (slower but successful)
   ```

2. **Memory Leak in Application:**

   ```bash
   Without swap: Server crashes, immediate outage
   With swap:    Server stays up, time to fix the leak
   ```

3. **Traffic Spike:**
   ```bash
   Without swap: Connection refused, users see errors
   With swap:    Slower response, but service remains available
   ```

## 🔧 Maintenance Commands

### **Swap Management:**

```bash
# Check swap usage
sudo swapon -s
free -h

# Disable swap (for maintenance)
sudo swapoff /swapfile

# Enable swap
sudo swapon /swapfile

# Recreate swap file (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### **Troubleshooting:**

```bash
# If swap isn't working:
ls -la /swapfile          # Check file exists
sudo swapon -s            # Check if active
cat /proc/meminfo | grep -i swap  # Check system recognition
```

## 📋 Best Practices

### **Do's:**

- ✅ Always configure swap on production servers
- ✅ Use appropriate swap sizes for workload
- ✅ Monitor swap usage regularly
- ✅ Set conservative swappiness values
- ✅ Keep swap files on fast storage (SSD)

### **Don'ts:**

- ❌ Don't disable swap on production servers
- ❌ Don't use excessive swap (> 2x RAM)
- ❌ Don't ignore high swap usage
- ❌ Don't use swap as primary memory solution
- ❌ Don't forget to persist swap in /etc/fstab

## 🎯 Summary

Swap files in our infrastructure serve as a **critical safety net**:

- **Prevents crashes** during memory spikes
- **Maintains service availability** during high load
- **Costs nothing** (uses existing disk space)
- **Automatic recovery** when memory pressure decreases
- **Essential for production** database servers

Our configuration provides:

- **Staging**: 1GB swap for 2GB RAM server
- **Production DB**: 2GB swap for 8GB RAM server
- **Production Apps**: 1GB swap for 8GB RAM servers

This setup ensures **99.9% uptime** by preventing OOM crashes while maintaining optimal performance during normal operations.

---

_For more infrastructure documentation, see:_

- [Infrastructure Overview](../README.md)
- [Database Architecture](../README.md#database-architecture)
- [Maintenance Mode](../README.md#maintenance-mode)

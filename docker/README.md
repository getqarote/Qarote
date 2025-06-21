# RabbitMQ Cluster Setup

This setup creates a 3-node RabbitMQ cluster with high availability and load balancing.

## Architecture

- **3 RabbitMQ Nodes**: `rabbitmq-node1`, `rabbitmq-node2`, `rabbitmq-node3`
- **HAProxy Load Balancer**: Distributes traffic across all nodes
- **PostgreSQL Database**: For the dashboard backend
- **High Availability**: All queues are mirrored across all nodes

## Ports

### Direct Node Access

- **Node 1**: AMQP: 5672, Management: 15672
- **Node 2**: AMQP: 5673, Management: 15673
- **Node 3**: AMQP: 5674, Management: 15674

### Load Balanced Access (Recommended)

- **AMQP**: Port 5675 (load balanced across all nodes)
- **Management UI**: Port 15675 (load balanced across all nodes)
- **HAProxy Stats**: Port 8404

### Database

- **PostgreSQL**: Port 5432

## Starting the Cluster

```bash
# Start all services
docker-compose up -d

# Check cluster status
docker-compose logs rabbitmq-node1 | grep "Cluster status"

# View HAProxy stats
open http://localhost:8404/stats
```

## Connecting to the Cluster

### For Applications

Use the load balanced endpoint:

- **Host**: localhost
- **Port**: 5675
- **Username**: admin
- **Password**: admin123

### Management UI

Access the load balanced management interface:

- **URL**: http://localhost:15675
- **Username**: admin
- **Password**: admin123

## Cluster Features

1. **High Availability**: All queues are automatically mirrored across all nodes
2. **Load Balancing**: HAProxy distributes connections across healthy nodes
3. **Automatic Failover**: If a node fails, traffic is automatically routed to healthy nodes
4. **Health Checks**: All services have health checks for monitoring

## Monitoring

- **Cluster Status**: Check any node's management UI under "Admin" > "Cluster"
- **HAProxy Stats**: http://localhost:8404/stats
- **Node Health**: `docker-compose ps` shows health status

## Scaling

To add more nodes:

1. Add a new service in `docker-compose.yml`
2. Update the HAProxy configuration
3. Use the cluster initialization script with the primary node

## Troubleshooting

```bash
# Check cluster status
docker exec rabbit_dashboard_rabbitmq_node1 rabbitmqctl cluster_status

# Check node status
docker exec rabbit_dashboard_rabbitmq_node1 rabbitmqctl node_health_check

# View logs
docker-compose logs rabbitmq-node1
docker-compose logs rabbitmq-haproxy

# Reset cluster (WARNING: This will delete all data)
docker-compose down -v
docker-compose up -d
```

# 🏗️ RabbitMQ Cluster Architecture

## 3-Node Cluster Setup

- rabbitmq-node1 (Primary): Ports 5672, 15672
- rabbitmq-node2 (Secondary): Ports 5673, 15673
- rabbitmq-node3 (Secondary): Ports 5674, 15674

## Key Features

- High Availability: All queues are automatically mirrored across all nodes
- Load Balancing: HAProxy distributes traffic evenly
- Automatic Failover: If a node fails, traffic routes to healthy nodes
- Health Monitoring: All services have health checks

## 🔧 Configuration Details

- Erlang Cookie: Shared across all nodes for cluster communication
- Mirroring Policy: ha-all ensures all queues are mirrored
- Health Checks: Each node monitors its own health
- Persistent Storage: Separate volumes for each node

## 🚀 Quick Start

### Start the entire cluster

docker-compose up -d

### Check cluster status

docker exec rabbit_dashboard_rabbitmq_node1 rabbitmqctl cluster_status

### Access load balanced management UI

open http://localhost:15675.

For your dashboard application, you should connect to the load balanced endpoint at localhost:5675 instead of individual nodes. This ensures high availability and automatic failover.

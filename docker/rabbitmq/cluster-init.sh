#!/bin/bash

# RabbitMQ Cluster Initialization Script
# This script sets up a RabbitMQ cluster with proper queue mirroring

NODE_NAME=$1
PRIMARY_NODE=${2:-"rabbitmq-node1"}

echo "Starting RabbitMQ node: $NODE_NAME"

# Start RabbitMQ server in the background
rabbitmq-server &
SERVER_PID=$!

# Wait for RabbitMQ to be ready
echo "Waiting for RabbitMQ to start..."
sleep 30

# If this is not the primary node, join the cluster
if [ "$NODE_NAME" != "$PRIMARY_NODE" ]; then
    echo "Joining cluster as secondary node..."
    
    # Stop the app
    rabbitmqctl stop_app
    
    # Join the cluster
    echo "Joining cluster: rabbit@$PRIMARY_NODE"
    rabbitmqctl join_cluster rabbit@$PRIMARY_NODE
    
    # Start the app
    rabbitmqctl start_app
    
    echo "Successfully joined cluster"
else
    echo "This is the primary node - waiting for other nodes to join"
    
    # Wait a bit more for the primary node to be fully ready
    sleep 15
    
    # Set up high availability policies for all queues
    echo "Setting up HA policies..."
    rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all","ha-sync-mode":"automatic"}'
    
    echo "Cluster primary node setup complete"
fi

# Check cluster status
echo "Cluster status:"
rabbitmqctl cluster_status

# Keep the container running
wait $SERVER_PID

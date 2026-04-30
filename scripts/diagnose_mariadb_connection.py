#!/usr/bin/env python3
"""
MariaDB Connection Diagnostic Tool
Helps diagnose connection issues by trying different approaches
"""

import pymysql
import socket
import sys

def test_network_connectivity(host, port=3306):
    """Test if we can reach the host and port"""
    try:
        sock = socket.create_connection((host, port), timeout=5)
        sock.close()
        print(f"✓ Network connectivity to {host}:{port} successful")
        return True
    except Exception as e:
        print(f"✗ Network connectivity to {host}:{port} failed: {e}")
        return False

def get_local_hostname():
    """Get the local hostname that the server will see"""
    try:
        hostname = socket.gethostname()
        fqdn = socket.getfqdn()
        local_ip = socket.gethostbyname(hostname)
        print(f"Local hostname: {hostname}")
        print(f"FQDN: {fqdn}")
        print(f"Local IP: {local_ip}")
        return hostname, fqdn, local_ip
    except Exception as e:
        print(f"Could not determine local hostname: {e}")
        return None, None, None

def test_mariadb_connection(host, user, password, database, port=3306):
    """Test MariaDB connection with detailed error reporting"""
    print(f"\n--- Testing MariaDB Connection ---")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"User: {user}")
    print(f"Database: {database}")
    print(f"Password: {'*' * len(password) if password else '(empty)'}")
    
    # Test network connectivity first
    if not test_network_connectivity(host, port):
        return False
    
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=10,
            read_timeout=10
        )
        
        with conn.cursor() as cursor:
            # Get server info
            cursor.execute("SELECT VERSION() as version, DATABASE() as current_db, USER() as current_user, CONNECTION_ID() as conn_id")
            result = cursor.fetchone()
            print(f"✓ Connection successful!")
            print(f"  Server Version: {result['version']}")
            print(f"  Current Database: {result['current_db']}")
            print(f"  Current User: {result['current_user']}")
            print(f"  Connection ID: {result['conn_id']}")
            
            # Check what the server sees as our hostname
            cursor.execute("SELECT SUBSTRING_INDEX(USER(), '@', -1) as client_host")
            client_info = cursor.fetchone()
            print(f"  Server sees client as: {client_info['client_host']}")
            
            # List available databases
            cursor.execute("SHOW DATABASES")
            databases = cursor.fetchall()
            print(f"  Available databases: {[db['Database'] for db in databases]}")
            
        conn.close()
        return True
        
    except pymysql.err.OperationalError as e:
        print(f"✗ Connection failed with OperationalError: {e}")
        if '1045' in str(e):
            print("  This is an 'Access Denied' error - user/password/hostname issue")
        elif '2003' in str(e):
            print("  This is a 'Can't connect' error - host/port/network issue")
        return False
    except Exception as e:
        print(f"✗ Connection failed with unexpected error: {e}")
        return False

def main():
    print("MariaDB Connection Diagnostic Tool")
    print("=" * 50)
    
    # Get local network info
    get_local_hostname()
    
    # Test connections
    hosts_to_try = [
        'py-it.lancaster.ac.uk',
    ]
    
    user = 'PhysicsStores'
    password = input(f"Enter password for user '{user}': ").strip()
    database = 'physicsstores'
    
    successful_connections = []
    
    for host in hosts_to_try:
        print(f"\n{'='*60}")
        print(f"Testing connection to: {host}")
        if test_mariadb_connection(host, user, password, database):
            successful_connections.append(host)
    
    print(f"\n{'='*60}")
    print("SUMMARY:")
    if successful_connections:
        print(f"✓ Successful connections: {successful_connections}")
        print(f"  Recommended host to use: {successful_connections[0]}")
    else:
        print("✗ No successful connections found")
        print("  Possible issues:")
        print("  1. Incorrect username or password")
        print("  2. User is not authorized from this hostname")
        print("  3. Database server is not accessible")
        print("  4. Firewall blocking connection")

if __name__ == '__main__':
    main()

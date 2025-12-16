/**
 * PM2 Ecosystem Configuration
 * 
 * Process manager configuration for running Node.js workers with:
 * - Graceful restart and shutdown
 * - Log rotation
 * - Clustering for API
 * - Memory limits
 * 
 * Usage:
 *   # Start all processes
 *   pm2 start pm2/ecosystem.config.js
 * 
 *   # Start specific app
 *   pm2 start pm2/ecosystem.config.js --only flashcard-api
 * 
 *   # View status
 *   pm2 status
 * 
 *   # View logs
 *   pm2 logs flashcard-orchestrator-worker
 * 
 *   # Restart with zero-downtime
 *   pm2 reload ecosystem.config.js
 * 
 *   # Stop all
 *   pm2 stop all
 * 
 * Prerequisites:
 *   - npm install -g pm2
 *   - Set environment variables or use .env file
 */

module.exports = {
    apps: [
        // =========================================================================
        // API Server
        // =========================================================================
        {
            name: 'flashcard-api',
            script: 'npm',
            args: 'run start',
            cwd: process.cwd(),
            instances: 'max',  // Cluster mode: use all CPUs
            exec_mode: 'cluster',

            // Environment
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
            },
            env_development: {
                NODE_ENV: 'development',
                PORT: 5000,
            },

            // Restart behavior
            watch: false,
            max_restarts: 10,
            min_uptime: '10s',
            restart_delay: 4000,

            // Memory management
            max_memory_restart: '1G',

            // Graceful shutdown
            kill_timeout: 10000,
            wait_ready: true,
            listen_timeout: 10000,

            // Logging
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: 'logs/api-error.log',
            out_file: 'logs/api-out.log',
            merge_logs: true,
            log_type: 'json',

            // Health check
            exp_backoff_restart_delay: 100,
        },

        // =========================================================================
        // Orchestrator Worker
        // =========================================================================
        {
            name: 'flashcard-orchestrator-worker',
            script: 'npm',
            args: 'run worker:orchestrator',
            cwd: process.cwd(),
            instances: 2,  // 2 worker instances
            exec_mode: 'cluster',

            // Environment
            env: {
                NODE_ENV: 'production',
                WORKER_CONCURRENCY: 2,
            },
            env_development: {
                NODE_ENV: 'development',
                WORKER_CONCURRENCY: 1,
            },

            // Restart behavior
            watch: false,
            max_restarts: 10,
            min_uptime: '30s',
            restart_delay: 5000,

            // Memory management - workers may need more memory for LLM responses
            max_memory_restart: '2G',

            // Graceful shutdown (allow jobs to complete)
            kill_timeout: 60000,  // 60 seconds to finish current job
            shutdown_with_message: true,

            // Logging
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: 'logs/orchestrator-error.log',
            out_file: 'logs/orchestrator-out.log',
            merge_logs: true,

            // Exponential backoff on crashes
            exp_backoff_restart_delay: 1000,
        },

        // =========================================================================
        // Transcription Worker
        // =========================================================================
        {
            name: 'flashcard-transcription-worker',
            script: 'npm',
            args: 'run worker:transcription',
            cwd: process.cwd(),
            instances: 1,  // Single instance due to high resource usage
            exec_mode: 'fork',

            // Environment
            env: {
                NODE_ENV: 'production',
                TRANSCRIPTION_PROVIDER: 'whisperx',
                WHISPERX_MODEL: 'base',
            },
            env_development: {
                NODE_ENV: 'development',
                TRANSCRIPTION_PROVIDER: 'whisperx',
                WHISPERX_MODEL: 'tiny',
            },

            // Restart behavior
            watch: false,
            max_restarts: 5,
            min_uptime: '60s',
            restart_delay: 10000,

            // Memory management - transcription can be memory intensive
            max_memory_restart: '8G',

            // Graceful shutdown (wait for transcription to complete)
            kill_timeout: 300000,  // 5 minutes

            // Logging
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: 'logs/transcription-error.log',
            out_file: 'logs/transcription-out.log',
            merge_logs: true,

            // Exponential backoff
            exp_backoff_restart_delay: 5000,
        },

        // =========================================================================
        // Metrics Exporter (optional - if not using built-in metrics)
        // =========================================================================
        {
            name: 'flashcard-metrics',
            script: 'npm',
            args: 'run metrics:server',
            cwd: process.cwd(),
            instances: 1,
            exec_mode: 'fork',

            env: {
                NODE_ENV: 'production',
                METRICS_PORT: 9090,
            },

            // Only start if explicitly requested
            autorestart: true,
            watch: false,

            // Logging
            error_file: 'logs/metrics-error.log',
            out_file: 'logs/metrics-out.log',

            // Disable by default (enable with --only or modify)
            // pm2 start ecosystem.config.js --only flashcard-metrics
        },
    ],

    // ===========================================================================
    // Deploy Configuration (optional - for pm2 deploy)
    // ===========================================================================
    deploy: {
        production: {
            user: 'deploy',
            host: ['server1.example.com', 'server2.example.com'],
            ref: 'origin/main',
            repo: 'git@github.com:your-org/flashcard-orchestrator.git',
            path: '/var/www/flashcard-orchestrator',
            'pre-deploy-local': '',
            'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env production',
            'pre-setup': '',
            ssh_options: 'StrictHostKeyChecking=no',
        },
        staging: {
            user: 'deploy',
            host: 'staging.example.com',
            ref: 'origin/develop',
            repo: 'git@github.com:your-org/flashcard-orchestrator.git',
            path: '/var/www/flashcard-orchestrator-staging',
            'post-deploy': 'npm ci && pm2 reload ecosystem.config.js --env development',
        },
    },
};

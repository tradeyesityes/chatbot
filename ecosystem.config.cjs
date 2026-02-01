module.exports = {
    apps: [
        {
            name: 'kbchatbot-v2',
            script: 'npm',
            args: 'run host',
            env: {
                NODE_ENV: 'production'
            }
        }
    ]
}

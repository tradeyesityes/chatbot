import React from 'react'
import botLogo from '../assets/bot-avatar.png'

interface BotAvatarProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    animate?: boolean
}

export const BotAvatar: React.FC<BotAvatarProps> = ({ size = 'md', className = '', animate = true }) => {
    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    }

    return (
        <div className={`relative flex items-center justify-center ${sizes[size]} ${className}`}>
            <img
                src={botLogo}
                alt="AI Assistant"
                className={`w-full h-full object-contain ${animate ? 'animate-float animate-bot-glow' : ''} drop-shadow-md`}
            />
        </div>
    )
}

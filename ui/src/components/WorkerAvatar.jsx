import React from 'react'
import { getAvatarGradient } from '../utils/avatarGradient'

export function WorkerAvatar({ name, size = 34 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: getAvatarGradient(name),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontFamily: "'Satoshi', sans-serif",
      fontWeight: 700,
      color: 'white',
      flexShrink: 0,
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

export default WorkerAvatar

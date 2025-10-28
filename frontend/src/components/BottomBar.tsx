import useUIStore from '../store/ui'

export default function BottomBar() {
  const actions = useUIStore(s => s.bottomActions)
  if (!actions || actions.length === 0) return null
  return (
    <div className='ctabar'>
      <div className='ctabar-inner'>
        {actions.map(a => (
          <button
            key={a.id}
            className={`btn${a.primary ? ' primary' : ''}`}
            disabled={!!a.disabled}
            onClick={a.onClick}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}


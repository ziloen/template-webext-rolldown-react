// 参考 SentinelJS 和 refined-github 的实现

const animationName = `observe-${crypto.randomUUID()}`

let registered = false
function registerAnimation() {
  if (registered) return

  registered = true

  if (document.getElementById('selector-observer-animation')) return

  const style = document.createElement('style')
  style.id = 'selector-observer-animation'
  style.textContent = `@keyframes ${animationName} {}`
  document.head.append(style)
}

export function observe(
  selector: string,
  listener: (element: Element, options: { signal: AbortSignal }) => void,
  { signal }: { signal: AbortSignal },
) {
  if (signal.aborted) return

  registerAnimation()

  const style = document.createElement('style')
  style.textContent = `:where(${selector}):not(data-observer-seen) {animation:${animationName} 1ms;}`
  document.head.prepend(style)

  signal.addEventListener('abort', () => {
    style.remove()
  })

  globalThis.addEventListener(
    'animationstart',
    (e) => {
      if (e.animationName !== animationName) return

      const target = e.target
      if (!(target instanceof Element)) return
      if (target.hasAttribute('data-observer-seen')) return
      if (!target.matches(selector)) return

      target.setAttribute('data-observer-seen', 'true')
      listener(target, { signal })
    },
    { signal },
  )
}

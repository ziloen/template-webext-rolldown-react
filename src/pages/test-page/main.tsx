import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('root')!).render(
  <div>
    <h1 className="text-[24px]">Test</h1>

    <button onClick={testPolyfill}></button>
  </div>,
)

function testPolyfill() {
  const a = Uint8Array.fromHex('cafed00d')

  console.log(a)
}

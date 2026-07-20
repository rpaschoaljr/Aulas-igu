import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  function increment() {
    if (count < 10) {
      setCount(count + 1)
    }

  }
  function decrement() {
    if (count > 0) {
      setCount(count - 1)
    }
   
  }
  return (
  <div>
      <button onClick={() => decrement()}>-</button>
      {count}
      <button onClick={() => increment()}>+</button>
    
  </div>

  ) 
}

export default App

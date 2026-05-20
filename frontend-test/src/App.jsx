import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'
import Chatbot from './pages/Chatbot'
import Login from './pages/Login'
import ScheduleTest from './pages/ScheduleTest'
import Signup from './pages/Signup'
import Sync from './pages/Sync'

function Home() {
  return (
    <div>
      <h1>frontend-test</h1>
      <ul>
        <li>
          <Link to="/chatbot">chatbot</Link>
        </li>
        <li>
          <Link to="/sync">sync</Link>
        </li>
        <li>
          <Link to="/schedule-test">schedule test</Link>
        </li>
        <li>
          <Link to="/signup">signup</Link>
        </li>
        <li>
          <Link to="/login">login</Link>
        </li>
      </ul>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/sync" element={<Sync />} />
        <Route path="/schedule-test" element={<ScheduleTest />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

import { NavLink } from 'react-router-dom'

const TAB_ITEMS = [
  { to: '/schedule-test/ocr', label: 'OCR 업로드' },
  { to: '/schedule-test/new', label: '스케줄 등록' },
  { to: '/schedule-test', label: '내 스케줄 목록' },
  { to: '/schedule-test/calendar', label: '내 달력' },
]

function ScheduleTabs() {
  return (
    <nav className="schedule-tabs" aria-label="Schedule navigation">
      {TAB_ITEMS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/schedule-test'}
          className={({ isActive }) =>
            ['schedule-tab-button', isActive ? 'schedule-tab-button-active' : ''].join(' ').trim()
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default ScheduleTabs

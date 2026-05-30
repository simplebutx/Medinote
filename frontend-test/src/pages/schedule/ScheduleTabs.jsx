import { NavLink } from 'react-router-dom'

const TAB_ITEMS = [
  { to: '/app/ocr', label: 'OCR 업로드' },
  { to: '/app/schedule/new', label: '직접 등록' },
  { to: '/app/schedule', label: '등록 목록' },
  { to: '/app/schedule/calendar', label: '복약 달력' },
]

function ScheduleTabs() {
  return (
    <nav className="schedule-tabs" aria-label="Schedule navigation">
      {TAB_ITEMS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/app/schedule'}
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

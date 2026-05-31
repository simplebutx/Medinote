function SimplePlaceholderPage({ eyebrow, title, description }) {
  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">{eyebrow}</p>
        <h1 className="app-page-title">{title}</h1>
        <p className="app-page-description">{description}</p>
      </div>

      <section className="app-card app-placeholder-card">
        <p>{title} 기능은 아직 화면 구성만 맞춰둔 상태입니다.</p>
      </section>
    </div>
  )
}

export default SimplePlaceholderPage

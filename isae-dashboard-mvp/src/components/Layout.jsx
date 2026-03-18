const pages = ['Dashboard', 'Risks', 'Controls', 'Evidence'];

export default function Layout({ activePage, onNavigate, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">ISAE 3402</p>
          <h1>Executive MVP</h1>
          <p className="sidebar-copy">
            A simple view of risks, controls, and supporting evidence.
          </p>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={page === activePage ? 'nav-item active' : 'nav-item'}
              onClick={() => onNavigate(page)}
            >
              {page}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

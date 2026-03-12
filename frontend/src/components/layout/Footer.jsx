import { BookOpen, Github, Twitter, Instagram } from 'lucide-react';

const footerLinks = {
  Explore: [
    { label: 'Browse Books', href: '/books' },
    { label: 'Popular Near You', href: '/books?sort=popular' },
    { label: 'Donate a Book', href: '/books/add' },
    { label: 'How It Works', href: '/#how-it-works' },
  ],
  Account: [
    { label: 'Login', href: '/login' },
    { label: 'Register', href: '/register' },
    { label: 'My Books', href: '/my-books' },
    { label: 'My Requests', href: '/requests/sent' },
  ],
  Company: [
    { label: 'About ReBook', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Contact', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer style={{ background: 'var(--bg-dark)' }} className="text-white">
      {/* Main grid */}
      <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <a href="/" className="flex items-center gap-0.5 mb-4 select-none">
              <span
                className="font-['Sora'] font-bold text-2xl leading-none"
                style={{ color: 'var(--primary)' }}
              >
                Re
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full mx-0.5 mb-1 flex-shrink-0"
                style={{ background: 'var(--primary)' }}
              />
              <span className="font-['Sora'] font-bold text-2xl leading-none text-white">
                Book
              </span>
            </a>

            <p className="text-sm font-['DM_Sans'] leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Borrow, donate, and exchange used books
              with people in your city. Free forever.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              {[
                { Icon: Twitter, label: 'Twitter' },
                { Icon: Instagram, label: 'Instagram' },
                { Icon: Github, label: 'GitHub' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0,201,167,0.2)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                  }}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="font-['DM_Sans'] font-semibold text-xs uppercase tracking-[0.08em] mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {heading}
              </h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm font-['DM_Sans'] transition-colors duration-150"
                      style={{ color: 'rgba(255,255,255,0.55)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div
          className="mt-12 pt-8 grid grid-cols-3 gap-6 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {[
            { value: '12,400+', label: 'Books Listed' },
            { value: '3,200+', label: 'Active Readers' },
            { value: '9', label: 'Cities' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-['Sora'] font-bold text-xl" style={{ color: 'var(--primary)' }}>
                {value}
              </p>
              <p className="text-xs font-['DM_Sans'] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <p className="text-xs font-['DM_Sans']" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © {new Date().getFullYear()} ReBook. All rights reserved.
          </p>
          <p className="hidden sm:block text-xs font-['DM_Sans']" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Made with ♥ for readers
          </p>
        </div>
      </div>
    </footer>
  );
}

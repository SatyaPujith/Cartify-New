import { Link } from 'react-router-dom';

const footerLinks = [
  {
    title: 'Get to Know Us',
    links: ['About Us', 'Careers', 'Press Releases', 'Amazon Science', 'Amazon Cares'],
  },
  {
    title: 'Connect with Us',
    links: ['Facebook', 'Twitter', 'Instagram', 'LinkedIn'],
  },
  {
    title: 'Make Money with Us',
    links: ['Sell on Amazon', 'Become an Affiliate', 'Advertise Your Products', 'Self-Publish with Us', 'Host an Amazon Hub'],
  },
  {
    title: 'Let Us Help You',
    links: ['Your Account', 'Returns Centre', '100% Purchase Protection', 'Amazon App Download', 'Help'],
  },
];

export default function Footer() {
  return (
    <footer className="mt-8">
      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-full bg-amazon-navy-hover text-white text-sm py-4 hover:bg-amazon-navy-hover/80 transition-colors"
      >
        Back to top
      </button>

      {/* Main footer links */}
      <div className="bg-amazon-navy-light text-white">
        <div className="max-w-amazon mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold text-base mb-3">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <Link to="/" className="text-sm text-gray-300 hover:underline hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Logo line */}
      <div className="bg-amazon-navy-light border-t border-gray-600 py-6">
        <div className="max-w-amazon mx-auto px-4 flex flex-col items-center gap-2">
          <span className="text-2xl font-bold text-white">
            amazon<span className="text-amazon-orange">.</span>
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-500 rounded text-xs text-gray-300 hover:border-gray-300">
              English
            </button>
            <button className="px-3 py-1 border border-gray-500 rounded text-xs text-gray-300 hover:border-gray-300">
              India
            </button>
            <button className="px-3 py-1 border border-gray-500 rounded text-xs text-gray-300 hover:border-gray-300">
              INR (₹)
            </button>
          </div>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="bg-amazon-navy text-gray-400 py-6">
        <div className="max-w-amazon mx-auto px-4 text-center text-xs space-y-2">
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-1">
            <Link to="/" className="hover:text-white hover:underline">Conditions of Use & Sale</Link>
            <Link to="/" className="hover:text-white hover:underline">Privacy Notice</Link>
            <Link to="/" className="hover:text-white hover:underline">Interest-Based Ads</Link>
          </div>
          <p>© 1996-2026, Amazon Clone, Inc. or its affiliates — Built for Razorpay Agentic Commerce Hackathon</p>
        </div>
      </div>
    </footer>
  );
}

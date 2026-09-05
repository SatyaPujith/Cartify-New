import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, ShoppingCart, MapPin, ChevronDown, Menu } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { categories } from '@/data/products';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&category=${searchCategory}`);
    }
  };

  return (
    <header className="bg-cartify-navy text-white sticky top-0 z-50">
      {/* Main header row */}
      <div className="flex items-center px-2 sm:px-4 h-[60px] gap-2">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-cartify-navy-hover rounded"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center px-2 hover:border border-transparent hover:border-white rounded shrink-0">
          <span className="text-2xl font-bold tracking-tight">
            Cartify<span className="text-cartify-orange">.</span>
          </span>
        </Link>

        {/* Deliver to */}
        <div className="hidden md:flex items-center px-2 hover:border border-transparent hover:border-white rounded cursor-pointer">
          <MapPin className="w-5 h-5 text-white/80 mr-1" />
          <div className="leading-tight">
            <div className="text-xs text-white/80">Deliver to</div>
            <div className="text-sm font-bold">India</div>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex-1 flex h-10 rounded-md overflow-hidden max-w-4xl">
          <div className="hidden sm:flex relative">
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="h-full bg-cartify-card-header text-gray-900 text-xs border-r border-gray-300 px-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cartify-orange"
            >
              <option value="All">All</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Cartify.in"
            className="flex-1 h-full px-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-cartify-orange text-sm"
          />
          <button
            type="submit"
            className="bg-cartify-yellow hover:bg-cartify-yellow-hover px-4 flex items-center justify-center transition-colors"
          >
            <Search className="w-5 h-5 text-gray-900" />
          </button>
        </form>

        {/* Language */}
        <div className="hidden lg:flex items-center px-2 hover:border border-transparent hover:border-white rounded cursor-pointer">
          <span className="text-sm font-bold">EN</span>
          <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
        </div>

        {/* Account */}
        <div className="hidden md:block px-2 hover:border border-transparent hover:border-white rounded cursor-pointer">
          <div className="text-xs text-white/80">Hello, sign in</div>
          <div className="text-sm font-bold flex items-center">
            Account & Lists
            <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
          </div>
        </div>

        {/* Returns */}
        <div className="hidden lg:block px-2 hover:border border-transparent hover:border-white rounded cursor-pointer">
          <div className="text-xs text-white/80">Returns</div>
          <div className="text-sm font-bold">& Orders</div>
        </div>

        {/* Cart */}
        <Link
          to="/cart"
          className="flex items-end px-2 hover:border border-transparent hover:border-white rounded shrink-0"
        >
          <div className="relative">
            <ShoppingCart className="w-8 h-8" />
            <span className="absolute -top-1 left-4 text-cartify-orange font-bold text-sm min-w-[20px] text-center">
              {cartCount}
            </span>
          </div>
          <span className="hidden sm:inline text-sm font-bold ml-1 mb-1">Cart</span>
        </Link>
      </div>

      {/* Sub nav */}
      <div className="bg-cartify-navy-light flex items-center px-2 sm:px-4 h-[39px] gap-1 text-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button
          onClick={onMenuClick}
          className="flex items-center gap-1 px-2 py-1 hover:border border-transparent hover:border-white rounded font-bold"
        >
          <Menu className="w-4 h-4" />
          All
        </button>
        {['Today\'s Deals', 'Mobiles', 'Electronics', 'Fashion', 'Home & Kitchen', 'Grocery', 'Gifts', 'Customer Service'].map((item) => (
          <Link
            key={item}
            to={item === 'Today\'s Deals' ? '/deals' : `/category/${item}`}
            className="px-2 py-1 hover:border border-transparent hover:border-white rounded text-white/90"
          >
            {item}
          </Link>
        ))}
        <span className="ml-auto text-cartify-yellow font-bold hidden md:inline">
          Shop deals in Electronics
        </span>
      </div>
    </header>
  );
}

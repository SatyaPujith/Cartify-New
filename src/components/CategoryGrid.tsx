import { Link } from 'react-router-dom';
import { Smartphone, CookingPot, ShoppingCart, Gift, Shirt, Home, Book, Sparkles, ChevronRight } from 'lucide-react';

const iconMap: Record<string, typeof Smartphone> = {
  Smartphone,
  CookingPot,
  ShoppingCart,
  Gift,
  Shirt,
  Home,
  Book,
  Sparkles,
};

const categoryCards = [
  {
    title: 'Electronics',
    items: ['Headphones', 'Smartphones', 'Smart TVs', 'Speakers'],
    image: 'https://images.unsplash.com/photo-1498049792261-1ac53695b1d6?w=300',
    link: '/category/Electronics',
    icon: 'Smartphone',
  },
  {
    title: 'Kitchen & Dining',
    items: ['Gas Stoves', 'Pressure Cookers', 'Cookware', 'Appliances'],
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300',
    link: '/category/Kitchen',
    icon: 'CookingPot',
  },
  {
    title: 'Grocery & Gourmet',
    items: ['Dal & Pulses', 'Atta & Flour', 'Cooking Oil', 'Spices'],
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300',
    link: '/category/Grocery',
    icon: 'ShoppingCart',
  },
  {
    title: 'Gift Ideas',
    items: ['Chocolates', 'Gift Packs', 'Gadgets', 'Combos'],
    image: 'https://images.unsplash.com/photo-1548901671-317b4f4a5e3f?w=300',
    link: '/category/Gifts',
    icon: 'Gift',
  },
];

export default function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {categoryCards.map((card) => {
        const Icon = iconMap[card.icon] ?? Smartphone;
        return (
          <div key={card.title} className="bg-white rounded-md p-4">
            <h3 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
              <Icon className="w-5 h-5 text-amazon-orange" />
              {card.title}
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {card.items.map((item, idx) => (
                <Link
                  key={item}
                  to={`/search?q=${encodeURIComponent(item)}`}
                  className="flex flex-col items-center group/item"
                >
                  <div className="w-full aspect-square bg-gray-50 rounded overflow-hidden">
                    <img
                      src={card.image}
                      alt={item}
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-xs text-gray-700 mt-1 text-center group-hover/item:text-amazon-link">
                    {item}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to={card.link}
              className="text-sm text-amazon-link hover:text-amazon-orange hover:underline flex items-center"
            >
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

import HeroBanner from '@/components/HeroBanner';
import CategoryGrid from '@/components/CategoryGrid';
import ProductRow from '@/components/ProductRow';
import { useProducts } from '@/context/ProductContext';

export default function HomePage() {
  const { getProductsByCategory, getDeals } = useProducts();

  const electronics = getProductsByCategory('Electronics');
  const kitchen = getProductsByCategory('Kitchen');
  const grocery = getProductsByCategory('Grocery');
  const deals = getDeals();

  return (
    <div>
      <HeroBanner />

      <div className="max-w-cartify mx-auto px-2 sm:px-4 -mt-8 relative z-10">
        <CategoryGrid />

        {deals.length > 0 && <ProductRow title="Today's Deals" products={deals} seeMoreLink="/deals" />}
        {electronics.length > 0 && <ProductRow title="Best Sellers in Electronics" products={electronics} seeMoreLink="/category/Electronics" />}
        {kitchen.length > 0 && <ProductRow title="Kitchen Essentials" products={kitchen} seeMoreLink="/category/Kitchen" />}
        {grocery.length > 0 && <ProductRow title="Fresh Groceries" products={grocery} seeMoreLink="/category/Grocery" />}
      </div>
    </div>
  );
}

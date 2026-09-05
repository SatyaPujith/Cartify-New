import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from '@/context/CartContext';
import { ProductProvider } from '@/context/ProductContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AgentChat from '@/components/AgentChat';
import DevModeIndicator from '@/components/DevModeIndicator';
import HomePage from '@/pages/HomePage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import SearchPage from '@/pages/SearchPage';
import CategoryPage from '@/pages/CategoryPage';
import CheckoutPage from '@/pages/CheckoutPage';

function App() {
  return (
    <ProductProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-amazon-background flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/category/:categoryName" element={<CategoryPage />} />
                <Route path="/deals" element={<CategoryPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
              </Routes>
            </main>
            <Footer />
            <AgentChat />
            <DevModeIndicator />
          </div>
        </BrowserRouter>
      </CartProvider>
    </ProductProvider>
  );
}

export default App;

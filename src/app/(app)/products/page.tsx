import { getProducts } from '@/lib/actions/products';
import ProductsClient from './ProductsClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const productList = await getProducts();
  return <ProductsClient initialProducts={productList} />;
}

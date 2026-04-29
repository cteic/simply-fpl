import { PriceChangesView } from '@/components/price-changes-view';

export default function PricesPage() {
  return <PriceChangesView />;
}

export const metadata = {
  title: 'Price Changes — SimplyFPL',
  description: 'Predicted FPL price rises and falls based on live transfer activity.',
};

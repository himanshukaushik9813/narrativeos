import { PathMarketDetail } from "@/components/marketplace/PathMarketDetail";

export default function MarketDetailPage({ params }: { params: { contractId: string } }) {
  return <PathMarketDetail contractId={params.contractId} />;
}

import CalendarDateRangePicker from "@/components/custom-date-range-picker";
import { Button } from "@/components/ui/button";
import {
  AverageDailySalesCard,
  EarningReportsCard,
  MonthlyCampaignStateCard,
  SaleOverviewCard,
  SalesByCountriesCard,
  TicketsCard,
  TotalEarningCard,
  WebsiteAnalyticsCard,
} from "@/pages/dashboard/analytics/components";
import StatCards from "@/pages/dashboard/analytics/components/stat-cards";

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
          Website Analytics
        </h1>
        <div className="flex items-center space-x-2">
          <div className="grow">
            <CalendarDateRangePicker />
          </div>
          <Button>Download</Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <StatCards />
        </div>
        <div className="lg:col-span-12 xl:col-span-8">
          <EarningReportsCard />
        </div>
        <div className="lg:col-span-12 xl:col-span-4">
          <TicketsCard />
        </div>
        <div className="lg:col-span-4">
          <WebsiteAnalyticsCard />
        </div>
        <div className="lg:col-span-4">
          <AverageDailySalesCard />
        </div>
        <div className="lg:col-span-4">
          <SaleOverviewCard />
        </div>
        <div className="lg:col-span-4">
          <SalesByCountriesCard />
        </div>
        <div className="lg:col-span-4">
          <TotalEarningCard />
        </div>
        <div className="lg:col-span-4">
          <MonthlyCampaignStateCard />
        </div>
      </div>
    </div>
  );
}
